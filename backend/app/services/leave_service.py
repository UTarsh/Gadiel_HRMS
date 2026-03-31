"""
Leave Decision Engine
Encodes Gadiel's leave policy rules for auto-approve / reject / escalate decisions.
"""
from datetime import date
from decimal import Decimal
from typing import Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.leave import LeaveType, LeaveBalance, LeaveRequest, LeaveStatus
from app.models.employee import Employee
import holidays as py_holidays


async def calculate_leave_days(from_date: date, to_date: date, is_half_day: bool, db: AsyncSession) -> Decimal:
    """Count business days between dates, excluding Sundays and public holidays."""
    if is_half_day:
        return Decimal("0.5")

    india_holidays = py_holidays.India(years=from_date.year)
    total = Decimal("0")
    current = from_date
    while current <= to_date:
        # Skip Sundays (weekday 6) and public holidays
        if current.weekday() != 6 and current not in india_holidays:
            total += Decimal("1")
        current = date(current.year, current.month, current.day)
        # advance by 1 day
        from datetime import timedelta
        current = current + timedelta(days=1)
    return total


async def get_leave_balance(employee_id: str, leave_type_id: str, year: int, db: AsyncSession) -> Decimal:
    result = await db.execute(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_type_id == leave_type_id,
            LeaveBalance.year == year,
        )
    )
    balance = result.scalar_one_or_none()
    if not balance:
        return Decimal("0")
    return balance.available


async def evaluate_leave_request(
    employee: Employee,
    leave_type: LeaveType,
    days: Decimal,
    from_date: date,
    db: AsyncSession,
) -> Tuple[str, str]:
    """
    Returns (action, reason).
    action: auto_approve | send_to_manager | reject
    """
    year = from_date.year

    # 1. Balance check
    balance = await get_leave_balance(employee.id, leave_type.id, year, db)
    if leave_type.code != "LWP" and balance < days:
        return "reject", f"Insufficient {leave_type.code} balance. Available: {balance} days, Requested: {days} days."

    # 2. Notice period check
    from datetime import date as dt
    today = dt.today()
    notice_days = (from_date - today).days
    if notice_days < leave_type.min_notice_days:
        if leave_type.code in ("SL",):  # Sick leave — acceptable with 0 notice
            pass
        elif notice_days < 0:
            return "reject", f"Leave date is in the past."
        else:
            # Allow but escalate
            pass

    # 3. Probation check
    if leave_type.requires_probation_completion and employee.probation_end_date:
        if today < employee.probation_end_date and leave_type.code == "EL":
            return "reject", "Earned Leave is not available during probation period."

    # 4. Auto-approve check (per Gadiel policy — small leaves auto-approved)
    if leave_type.auto_approve_max_days and days <= Decimal(str(leave_type.auto_approve_max_days)):
        return "auto_approve", "Auto-approved as leave days are within auto-approval threshold."

    # 5. Default: send to manager
    return "send_to_manager", "Leave request sent to reporting manager for approval."


async def apply_leave(
    employee: Employee,
    leave_type_id: str,
    from_date: date,
    to_date: date,
    is_half_day: bool,
    reason: str | None,
    db: AsyncSession,
) -> LeaveRequest:
    leave_type_result = await db.execute(select(LeaveType).where(LeaveType.id == leave_type_id))
    leave_type = leave_type_result.scalar_one_or_none()
    if not leave_type:
        raise ValueError("Leave type not found")

    days = await calculate_leave_days(from_date, to_date, is_half_day, db)
    action, reason_msg = await evaluate_leave_request(employee, leave_type, days, from_date, db)

    status_map = {
        "auto_approve": LeaveStatus.auto_approved,
        "send_to_manager": LeaveStatus.pending,
        "reject": LeaveStatus.rejected,
    }

    leave_req = LeaveRequest(
        employee_id=employee.id,
        leave_type_id=leave_type_id,
        from_date=from_date,
        to_date=to_date,
        days=days,
        is_half_day=is_half_day,
        reason=reason,
        status=status_map[action],
        rejection_reason=reason_msg if action == "reject" else None,
        ai_decision_log=reason_msg,
    )
    db.add(leave_req)

    # Update balance pending/used
    if action != "reject":
        year = from_date.year
        bal_result = await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == employee.id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.year == year,
            )
        )
        balance = bal_result.scalar_one_or_none()
        if balance:
            if action == "auto_approve":
                balance.used += days
            else:
                balance.pending += days

    await db.flush()
    return leave_req
