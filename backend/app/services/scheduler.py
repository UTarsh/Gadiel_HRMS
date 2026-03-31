from datetime import datetime, date
from decimal import Decimal
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, and_, text

from app.database import AsyncSessionLocal
from app.models.employee import Employee, EmploymentStatus
from app.models.employee_profile import EmployeeProfile
from app.models.leave import LeaveBalance, LeaveType
from app.models.notification import Notification, NotificationType
from app.models.payroll import PayrollRun, PayrollStatus
from app.utils.logger import logger
from app.config import settings
import pytz

# Scheduler instance (initialized in start_scheduler)
scheduler: AsyncIOScheduler = None  # type: ignore

# ── Leave entitlements per Gadiel policy GTPL/25-26/HRP-001 ──────────────────
# Used by the annual FY renewal job. Must stay in sync with init_production.py.
_ENTITLEMENTS: dict[str, int] = {
    "EL":    12,
    "SL":    12,
    "CL":     8,
    "ML":    90,   # female only — enforced per-employee below
    "PatL":  10,   # male only  — enforced per-employee below
    "BL":     5,
    "LWP":    0,   # no pre-allocated balance
}


# ─────────────────────────────────────────────────────────────────────────────
# Job 1 — Monthly EL accrual (1st of every month at 00:01)
# ─────────────────────────────────────────────────────────────────────────────
async def accrue_monthly_leaves():
    """Add 1 day of EL to every active employee on the 1st of each month."""
    logger.info("Starting monthly EL accrual job...")
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(LeaveType).where(LeaveType.code == "EL"))
            el_type = result.scalar_one_or_none()
            if not el_type:
                logger.error("EL leave type not found — skipping accrual.")
                return

            result = await session.execute(
                select(Employee).where(Employee.employment_status == EmploymentStatus.active)
            )
            employees = result.scalars().all()

            # Fiscal year: April–March.  EL accrues into the current FY year bucket.
            today = date.today()
            fy_year = today.year if today.month >= 4 else today.year - 1

            for emp in employees:
                bal_result = await session.execute(
                    select(LeaveBalance).where(
                        LeaveBalance.employee_id == emp.id,
                        LeaveBalance.leave_type_id == el_type.id,
                        LeaveBalance.year == fy_year,
                    )
                )
                balance = bal_result.scalar_one_or_none()
                if balance:
                    balance.accrued = Decimal(str(balance.accrued)) + Decimal("1")
                else:
                    session.add(LeaveBalance(
                        id=str(uuid.uuid4()),
                        employee_id=emp.id,
                        leave_type_id=el_type.id,
                        year=fy_year,
                        total_entitled=el_type.entitlement_days_annual or 0,
                        accrued=Decimal("1"),
                        used=Decimal("0"),
                        pending=Decimal("0"),
                        carried_forward=Decimal("0"),
                    ))

            await session.commit()
            logger.info(f"Accrued 1 EL day for {len(employees)} employees (FY{fy_year}).")
        except Exception:
            logger.error("Error in accrue_monthly_leaves", exc_info=True)
            await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Job 2 — Annual FY leave renewal (every April 1st at 00:05 IST)
# ─────────────────────────────────────────────────────────────────────────────
async def renew_annual_leaves():
    """
    Runs on April 1st of every year (start of Gadiel's financial year).

    For each active employee × each active leave type:
      - Create a fresh LeaveBalance row for the new FY year.
      - EL: carry forward unused EL up to `max_carryforward_days` from LeaveType.
      - All other types: fresh entitlement, no carry forward.
      - Gender-gated types (ML/PatL): grant only to the applicable gender.
      - Skip if the balance row already exists (idempotent — safe to re-run).
    """
    today = date.today()
    # April 1 of the current calendar year starts FY `today.year`
    new_fy_year = today.year
    logger.info(f"Starting annual FY{new_fy_year} leave renewal...")

    async with AsyncSessionLocal() as session:
        try:
            # Active employees
            result = await session.execute(
                select(Employee).where(Employee.employment_status == EmploymentStatus.active)
            )
            employees = result.scalars().all()

            # All active leave types
            result = await session.execute(
                select(LeaveType).where(LeaveType.is_active == True)
            )
            leave_types = result.scalars().all()

            prev_fy_year = new_fy_year - 1  # previous FY year to pull EL carry-forward from
            created = 0
            skipped = 0

            for emp in employees:
                for lt in leave_types:
                    # Idempotency: skip if balance already created for this FY
                    existing = await session.execute(
                        select(LeaveBalance).where(
                            and_(
                                LeaveBalance.employee_id == emp.id,
                                LeaveBalance.leave_type_id == lt.id,
                                LeaveBalance.year == new_fy_year,
                            )
                        )
                    )
                    if existing.scalar_one_or_none():
                        skipped += 1
                        continue

                    entitled = _ENTITLEMENTS.get(lt.code, lt.entitlement_days_annual or 0)

                    # Gender-gated leaves
                    if lt.code == "ML" and emp.gender != "female":
                        entitled = 0
                    if lt.code == "PatL" and emp.gender != "male":
                        entitled = 0

                    # EL carry-forward: unused EL from previous FY, capped by LeaveType limit
                    carry = Decimal("0")
                    if lt.code == "EL":
                        prev_result = await session.execute(
                            select(LeaveBalance).where(
                                and_(
                                    LeaveBalance.employee_id == emp.id,
                                    LeaveBalance.leave_type_id == lt.id,
                                    LeaveBalance.year == prev_fy_year,
                                )
                            )
                        )
                        prev_bal = prev_result.scalar_one_or_none()
                        if prev_bal:
                            unused = (
                                Decimal(str(prev_bal.total_entitled))
                                + Decimal(str(prev_bal.accrued))
                                + Decimal(str(prev_bal.carried_forward))
                                - Decimal(str(prev_bal.used))
                                - Decimal(str(prev_bal.pending))
                            )
                            max_cf = Decimal(str(lt.max_carryforward_days or 0))
                            carry = min(max(unused, Decimal("0")), max_cf)

                    session.add(LeaveBalance(
                        id=str(uuid.uuid4()),
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        year=new_fy_year,
                        total_entitled=Decimal(str(entitled)),
                        carried_forward=carry,
                        accrued=Decimal(str(entitled)),  # grant full upfront for non-EL; EL accrues monthly
                        used=Decimal("0"),
                        pending=Decimal("0"),
                    ))
                    created += 1

            await session.commit()
            logger.info(
                f"FY{new_fy_year} leave renewal complete — "
                f"created: {created}, already existed (skipped): {skipped}"
            )
        except Exception:
            logger.error("Error in renew_annual_leaves", exc_info=True)
            await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Job 3 — FY start data reset (April 1st at 00:01 IST — runs BEFORE leave renewal)
# ─────────────────────────────────────────────────────────────────────────────
async def fy_start_reset():
    """
    Runs at the very start of every new financial year (April 1st, 00:01 IST).

    Clears all operational/transactional data so every FY starts clean:
      - notifications, attendance_logs, audit_logs
      - payslips, payroll_runs
      - device_tokens (force re-registration keeps FCM tokens fresh)

    Leave balances and leave requests are NOT cleared here — leave balances are
    renewed by renew_annual_leaves() at 00:05, and historical leave requests are
    kept for record-keeping.
    """
    logger.info("Starting FY start reset...")
    async with AsyncSessionLocal() as session:
        try:
            async with session.begin():
                await session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
                for table in [
                    "notifications",
                    "attendance_logs",
                    "audit_logs",
                    "payslips",
                    "payroll_runs",
                    "device_tokens",
                ]:
                    await session.execute(text(f"TRUNCATE TABLE {table}"))
                    logger.info(f"Cleared: {table}")
                await session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            logger.info("FY start reset complete.")
        except Exception:
            logger.error("Error in fy_start_reset", exc_info=True)


# ─────────────────────────────────────────────────────────────────────────────
# Job 4 — Daily birthday & work-anniversary celebrations (every day at 09:00 IST)
# ─────────────────────────────────────────────────────────────────────────────
async def send_daily_celebrations():
    """
    Runs every morning at 09:00 IST.
    For each active employee whose birthday or work-anniversary is today:
      - Sends a personal greeting notification to the employee themselves.
      - Broadcasts an announcement notification to ALL employees.
    Idempotent: skips if a celebration notification for the same employee
    already exists today (prevents duplicate sends on restart).
    """
    today = date.today()
    logger.info(f"Running daily celebrations check for {today}...")

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(Employee).where(Employee.employment_status == EmploymentStatus.active)
            )
            employees = result.scalars().all()

            # Full list needed for broadcasting to everyone
            all_ids = [e.id for e in employees]

            for emp in employees:
                # ── Birthday ─────────────────────────────────────────────────
                profile_result = await session.execute(
                    select(EmployeeProfile).where(EmployeeProfile.employee_id == emp.id)
                )
                profile = profile_result.scalar_one_or_none()
                birthday = profile.birthday if profile else None

                if birthday and birthday.month == today.month and birthday.day == today.day:
                    # Check idempotency — skip if already sent today
                    existing = await session.execute(
                        select(Notification).where(
                            Notification.employee_id == emp.id,
                            Notification.notification_type == NotificationType.birthday,
                            Notification.reference_id == str(today),
                        )
                    )
                    if not existing.scalar_one_or_none():
                        age = today.year - birthday.year
                        age_text = f" — turning {age} today" if age > 0 else ""

                        # Personal greeting to the birthday person
                        session.add(Notification(
                            employee_id=emp.id,
                            notification_type=NotificationType.birthday,
                            title=f"Happy Birthday, {emp.first_name}! 🎂",
                            body=(
                                f"Wishing you a wonderful birthday{age_text}! "
                                f"May this year bring you great success, happiness, and amazing moments. "
                                f"The entire Gadiel team is celebrating with you today! 🎉"
                            ),
                            reference_id=str(today),
                            reference_type="birthday",
                        ))

                        # Announcement to all other employees
                        for eid in all_ids:
                            if eid == emp.id:
                                continue
                            session.add(Notification(
                                employee_id=eid,
                                notification_type=NotificationType.announcement,
                                title=f"🎂 It's {emp.first_name}'s Birthday!",
                                body=(
                                    f"Today is {emp.full_name}'s birthday{age_text}! "
                                    f"Wish them a wonderful day and make them feel special. 🥳"
                                ),
                                reference_id=str(today),
                                reference_type="birthday_broadcast",
                            ))

                        logger.info(f"Birthday notifications sent for {emp.full_name}")

                # ── Work Anniversary ──────────────────────────────────────────
                doj = emp.date_of_joining
                if doj and doj.month == today.month and doj.day == today.day and doj.year != today.year:
                    years = today.year - doj.year

                    existing = await session.execute(
                        select(Notification).where(
                            Notification.employee_id == emp.id,
                            Notification.notification_type == NotificationType.work_anniversary,
                            Notification.reference_id == str(today),
                        )
                    )
                    if not existing.scalar_one_or_none():
                        ordinal = (
                            f"{years}st" if years % 10 == 1 and years % 100 != 11 else
                            f"{years}nd" if years % 10 == 2 and years % 100 != 12 else
                            f"{years}rd" if years % 10 == 3 and years % 100 != 13 else
                            f"{years}th"
                        )

                        # Personal greeting to the employee
                        session.add(Notification(
                            employee_id=emp.id,
                            notification_type=NotificationType.work_anniversary,
                            title=f"Happy {ordinal} Work Anniversary, {emp.first_name}! 🎉",
                            body=(
                                f"You've completed {ordinal} year{'s' if years > 1 else ''} at Gadiel Technologies today! "
                                f"Thank you for your dedication, hard work, and the energy you bring every day. "
                                f"Here's to many more years of growth together! 🚀"
                            ),
                            reference_id=str(today),
                            reference_type="work_anniversary",
                        ))

                        # Announcement to all other employees
                        for eid in all_ids:
                            if eid == emp.id:
                                continue
                            session.add(Notification(
                                employee_id=eid,
                                notification_type=NotificationType.announcement,
                                title=f"🎉 {emp.first_name} completes {ordinal} year at Gadiel!",
                                body=(
                                    f"{emp.full_name} is celebrating their {ordinal} work anniversary today! "
                                    f"Take a moment to congratulate them on this milestone. 🙌"
                                ),
                                reference_id=str(today),
                                reference_type="anniversary_broadcast",
                            ))

                        logger.info(f"Work anniversary notifications sent for {emp.full_name} ({ordinal} year)")

            await session.commit()
            logger.info("Daily celebrations check complete.")
        except Exception:
            logger.error("Error in send_daily_celebrations", exc_info=True)
            await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Job 5 — Monthly payroll draft (25th of every month at 10:00 AM IST)
# ─────────────────────────────────────────────────────────────────────────────
async def draft_monthly_payroll():
    """Create a draft payroll run on the 25th of every month."""
    logger.info("Starting monthly payroll draft job...")
    async with AsyncSessionLocal() as session:
        try:
            now = datetime.now()
            result = await session.execute(
                select(PayrollRun).where(
                    PayrollRun.month == now.month,
                    PayrollRun.year == now.year,
                )
            )
            if result.scalar_one_or_none():
                logger.info("Payroll run for this month already exists — skipping.")
                return

            session.add(PayrollRun(
                month=now.month,
                year=now.year,
                status=PayrollStatus.draft,
                created_by_id=None,
                notes=f"Auto-generated draft for {now.strftime('%B %Y')}",
            ))
            await session.commit()
            logger.info(f"Created payroll draft for {now.month}/{now.year}")
        except Exception:
            logger.error("Error in draft_monthly_payroll", exc_info=True)
            await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler lifecycle
# ─────────────────────────────────────────────────────────────────────────────
def start_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        return

    tz = pytz.timezone(settings.TIMEZONE)
    scheduler = AsyncIOScheduler(timezone=tz)

    # Job 1 — EL accrual: 1st of every month at 00:01 IST
    scheduler.add_job(
        accrue_monthly_leaves,
        CronTrigger(day=1, hour=0, minute=1, timezone=tz),
        id="accrue_el_monthly",
        replace_existing=True,
    )

    # Job 2 — FY start reset: April 1st at 00:01 IST (clears operational data)
    scheduler.add_job(
        fy_start_reset,
        CronTrigger(month=4, day=1, hour=0, minute=1, timezone=tz),
        id="fy_start_reset",
        replace_existing=True,
    )

    # Job 3 — Annual FY leave renewal: April 1st at 00:05 IST (after reset)
    scheduler.add_job(
        renew_annual_leaves,
        CronTrigger(month=4, day=1, hour=0, minute=5, timezone=tz),
        id="renew_leaves_annual",
        replace_existing=True,
    )

    # Job 4 — Daily birthday & work-anniversary celebrations: every day at 09:00 IST
    scheduler.add_job(
        send_daily_celebrations,
        CronTrigger(hour=9, minute=0, timezone=tz),
        id="daily_celebrations",
        replace_existing=True,
    )

    # Job 5 — Payroll draft: 25th of every month at 10:00 IST
    scheduler.add_job(
        draft_monthly_payroll,
        CronTrigger(day=25, hour=10, minute=0, timezone=tz),
        id="draft_payroll_monthly",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started (5 jobs: EL accrual, FY reset, FY leave renewal, celebrations, payroll draft).")


def shutdown_scheduler():
    if scheduler:
        scheduler.shutdown()
        logger.info("Background scheduler shut down.")
