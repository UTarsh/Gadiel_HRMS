from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import date, datetime, timezone
from datetime import time as time_type
from decimal import Decimal
from typing import Optional
import math
import uuid
import calendar
from zoneinfo import ZoneInfo

from app.database import get_db
from app.models.attendance import AttendanceLog, AttendanceStatus, GeofenceZone, Shift, ShiftAssignment
from app.models.audit_log import AuditAction
from app.models.employee import Employee, UserRole
from app.models.notification import Notification, NotificationType
from app.schemas.attendance import (
    PunchInRequest, PunchOutRequest, AttendanceLogOut, AttendanceSummary,
    ManualCorrectionRequest, GeofenceZoneCreate, GeofenceZoneUpdate, GeofenceZoneOut, GeofenceEmployeeOut,
)
from app.schemas.common import ok
from app.middleware.auth import get_current_employee, require_hr
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/attendance", tags=["Attendance"])

IST = ZoneInfo("Asia/Kolkata")
GRACE_MONTHLY_LIMIT = 3  # punch-ins during grace window allowed per month


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_week_off_saturday(d: date) -> bool:
    """
    Returns True if this date is a week-off Saturday.
    Rules:
      - 2nd Saturday of every month → week-off
      - Last Saturday of every month → week-off
    If there's only one Saturday in a month, it is also off.
    """
    if d.weekday() != 5:  # 5 = Saturday
        return False
    saturdays = [
        date(d.year, d.month, day)
        for day in range(1, calendar.monthrange(d.year, d.month)[1] + 1)
        if date(d.year, d.month, day).weekday() == 5
    ]
    if len(saturdays) < 2:
        return True  # only one Saturday in month → it's off
    return d == saturdays[1] or d == saturdays[-1]  # 2nd or last


def minutes_since_midnight(t: time_type) -> int:
    return t.hour * 60 + t.minute


async def check_geofence(lat: float, lng: float, employee: Employee, db: AsyncSession) -> bool:
    """
    Per-employee geofence logic:
      1. skip_location_check=True  → always valid  (WFH / field employees)
      2. geofence_zone_id set      → validate against that zone only
      3. No zone assigned          → check all active zones (default office)
      4. No zones at all           → always valid
    """
    if employee.skip_location_check:
        return True

    if employee.geofence_zone_id:
        result = await db.execute(
            select(GeofenceZone).where(
                GeofenceZone.id == employee.geofence_zone_id,
                GeofenceZone.is_active == True,
            )
        )
        zone = result.scalar_one_or_none()
        if not zone:
            return True  # zone deleted/inactive — allow
        return haversine_distance(lat, lng, float(zone.latitude), float(zone.longitude)) <= zone.radius_meters

    # No zone assigned — check all active zones
    result = await db.execute(select(GeofenceZone).where(GeofenceZone.is_active == True))
    zones = result.scalars().all()
    if not zones:
        return True
    for zone in zones:
        if haversine_distance(lat, lng, float(zone.latitude), float(zone.longitude)) <= zone.radius_meters:
            return True
    return False


async def get_employee_shift(employee_id: str, for_date: date, db: AsyncSession) -> Optional[Shift]:
    result = await db.execute(
        select(ShiftAssignment)
        .where(
            ShiftAssignment.employee_id == employee_id,
            ShiftAssignment.effective_from <= for_date,
            (ShiftAssignment.effective_to == None) | (ShiftAssignment.effective_to >= for_date),
        )
        .order_by(ShiftAssignment.effective_from.desc())
        .limit(1)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return None
    r = await db.execute(select(Shift).where(Shift.id == assignment.shift_id))
    return r.scalar_one_or_none()


async def assign_employees_to_zone(zone_id: str, employee_ids: list[str], db: AsyncSession) -> int:
    unique_ids = list(dict.fromkeys(employee_ids))

    if not unique_ids:
        await db.execute(
            update(Employee).where(Employee.geofence_zone_id == zone_id).values(geofence_zone_id=None)
        )
        return 0

    result = await db.execute(
        select(Employee.id).where(
            Employee.id.in_(unique_ids),
            Employee.is_active == True,
        )
    )
    valid_ids = set(result.scalars().all())
    invalid_ids = [emp_id for emp_id in unique_ids if emp_id not in valid_ids]
    if invalid_ids:
        raise HTTPException(status_code=400, detail="Some selected employees are invalid or inactive")

    await db.execute(
        update(Employee)
        .where(Employee.geofence_zone_id == zone_id, Employee.id.notin_(unique_ids))
        .values(geofence_zone_id=None)
    )
    await db.execute(
        update(Employee)
        .where(Employee.id.in_(unique_ids))
        .values(geofence_zone_id=zone_id, skip_location_check=False)
    )
    return len(unique_ids)


async def count_grace_uses_this_month(
    employee_id: str,
    shift_start: time_type,
    grace_period_minutes: int,
    year: int,
    month: int,
    exclude_date: date,
    db: AsyncSession,
) -> int:
    """
    Count how many days this month the employee punched in during the grace window
    (shift_start < punch_time <= shift_start + grace_period_minutes)
    AND was NOT marked late (i.e., grace was actually granted on that day).
    """
    start_of_month = date(year, month, 1)
    end_of_month = date(year, month, calendar.monthrange(year, month)[1])

    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.date >= start_of_month,
            AttendanceLog.date <= end_of_month,
            AttendanceLog.date != exclude_date,
            AttendanceLog.punch_in != None,
            AttendanceLog.status != AttendanceStatus.late,
        )
    )
    logs = result.scalars().all()

    grace_start_min = minutes_since_midnight(shift_start)
    grace_end_min = grace_start_min + grace_period_minutes
    grace_end = time_type(grace_end_min // 60, grace_end_min % 60)

    count = 0
    for log in logs:
        if log.punch_in:
            punch_ist = log.punch_in.replace(tzinfo=timezone.utc).astimezone(IST)
            punch_t = punch_ist.time().replace(second=0, microsecond=0)
            if shift_start < punch_t <= grace_end:
                count += 1
    return count


# ─────────────────────────────────────────────────────────────────────────────
# Punch In
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/punch-in")
async def punch_in(
    body: PunchInRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(IST)
    today = now_ist.date()  # canonical IST date

    # Block week-off Saturdays
    if is_week_off_saturday(today):
        raise HTTPException(
            status_code=400,
            detail="Today is a week-off Saturday. Office is closed.",
        )

    existing = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_employee.id,
            AttendanceLog.date == today,
        )
    )
    log = existing.scalar_one_or_none()
    if log and log.punch_in:
        raise HTTPException(status_code=400, detail="Already punched in today")

    # Geofence check — WFH declaration bypasses GPS check entirely
    if body.is_wfh:
        location_valid = True
    else:
        location_valid = await check_geofence(body.latitude, body.longitude, current_employee, db)
        if not location_valid:
            raise HTTPException(
                status_code=400,
                detail="Please be in the range of the office to punch your attendance.",
            )

    shift = await get_employee_shift(current_employee.id, today, db)

    late_minutes = 0
    # WFH status set by employee's explicit declaration — not by skip_location_check
    status = AttendanceStatus.wfh if body.is_wfh else AttendanceStatus.present

    if shift:
        shift_start = shift.start_time          # e.g. time(9, 30)
        grace_end_min = minutes_since_midnight(shift_start) + shift.grace_period_minutes

        punch_time = now_ist.time().replace(second=0, microsecond=0)
        punch_min = minutes_since_midnight(punch_time)
        shift_start_min = minutes_since_midnight(shift_start)

        if punch_min <= shift_start_min:
            # On time or early
            pass

        elif punch_min <= grace_end_min:
            # In grace window (e.g. 9:30 < punch <= 9:45)
            grace_used = await count_grace_uses_this_month(
                current_employee.id, shift_start, shift.grace_period_minutes,
                today.year, today.month, today, db
            )
            if grace_used >= GRACE_MONTHLY_LIMIT:
                # Grace quota exhausted — record late_minutes but keep wfh status for WFH
                late_minutes = punch_min - shift_start_min
                if not body.is_wfh:
                    status = AttendanceStatus.late

        else:
            # After grace window — late; keep wfh status for WFH employees
            late_minutes = punch_min - shift_start_min
            if not body.is_wfh:
                status = AttendanceStatus.late

    remarks = "WFH" if body.is_wfh else None

    if log:
        log.punch_in = now_utc
        log.punch_in_lat = Decimal(str(body.latitude))
        log.punch_in_lng = Decimal(str(body.longitude))
        log.punch_in_location_valid = location_valid
        log.status = status
        log.late_minutes = late_minutes
        log.shift_id = shift.id if shift else None
        if remarks:
            log.remarks = remarks
    else:
        log = AttendanceLog(
            employee_id=current_employee.id,
            date=today,
            punch_in=now_utc,
            punch_in_lat=Decimal(str(body.latitude)),
            punch_in_lng=Decimal(str(body.longitude)),
            punch_in_location_valid=location_valid,
            status=status,
            late_minutes=late_minutes,
            shift_id=shift.id if shift else None,
            remarks=remarks,
        )
        db.add(log)

    await db.flush()

    # WFH declared — notify reporting manager for accountability
    if body.is_wfh and current_employee.reporting_manager_id:
        db.add(Notification(
            employee_id=current_employee.reporting_manager_id,
            notification_type=NotificationType.system,
            title="WFH Check-In",
            body=f"{current_employee.full_name} has punched in as Work From Home today ({today.strftime('%d %b %Y')}).",
        ))

    # Audit trail for every punch-in
    await write_audit_log(
        db=db,
        action=AuditAction.created,
        entity_type="attendance_log",
        entity_id=log.id,
        performed_by_id=current_employee.id,
        description=f"Punch-in {'(WFH)' if body.is_wfh else '(office)'} — status: {status.value}",
    )

    msg = "Punch in recorded"
    if body.is_wfh and late_minutes > 0:
        msg += f" (WFH — {late_minutes} min late)"
    elif body.is_wfh:
        msg += " (WFH)"
    elif status == AttendanceStatus.late:
        msg += f" — marked late ({late_minutes} min)"
    return ok(data=AttendanceLogOut.model_validate(log), message=msg)


# ─────────────────────────────────────────────────────────────────────────────
# Punch Out
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/punch-out")
async def punch_out(
    body: PunchOutRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(IST)
    today = now_ist.date()

    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_employee.id,
            AttendanceLog.date == today,
        )
    )
    log = result.scalar_one_or_none()
    if not log or not log.punch_in:
        raise HTTPException(status_code=400, detail="No punch-in found for today")
    if log.punch_out:
        raise HTTPException(status_code=400, detail="Already punched out today")

    # WFH session → bypass geofence on punch-out too
    is_wfh_session = log.status == AttendanceStatus.wfh
    if is_wfh_session:
        location_valid = True
    else:
        location_valid = await check_geofence(body.latitude, body.longitude, current_employee, db)
        if not location_valid:
            raise HTTPException(
                status_code=400,
                detail="Please be in the range of the office to punch your attendance.",
            )

    working_minutes = int((now_utc - log.punch_in.replace(tzinfo=timezone.utc)).total_seconds() / 60)

    overtime_minutes = 0
    shift = await get_employee_shift(current_employee.id, today, db)
    if shift:
        # Shift end in IST as minutes since midnight
        shift_end_min = minutes_since_midnight(shift.end_time)
        now_min = minutes_since_midnight(now_ist.time())
        if now_min > shift_end_min:
            overtime_minutes = now_min - shift_end_min

        # Status based on hours worked
        # WFH: keep wfh status unless truly too short (then absent/half_day)
        # Office: don't downgrade late → absent unless truly short
        if working_minutes < float(shift.min_hours_for_half_day) * 60:
            log.status = AttendanceStatus.absent
        elif working_minutes < float(shift.min_hours_for_full_day) * 60:
            if log.status not in (AttendanceStatus.late, AttendanceStatus.wfh):
                log.status = AttendanceStatus.half_day
            # keep late or wfh status

    log.punch_out = now_utc
    log.punch_out_lat = Decimal(str(body.latitude))
    log.punch_out_lng = Decimal(str(body.longitude))
    log.punch_out_location_valid = location_valid
    log.working_minutes = working_minutes
    log.overtime_minutes = overtime_minutes

    msg = "Punch out recorded"
    if is_wfh_session:
        msg += f" (WFH — {working_minutes} min worked)"
    return ok(data=AttendanceLogOut.model_validate(log), message=msg)


# ─────────────────────────────────────────────────────────────────────────────
# Queries
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/today")
async def today_status(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).astimezone(IST).date()
    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_employee.id,
            AttendanceLog.date == today,
        )
    )
    log = result.scalar_one_or_none()
    return ok(data=AttendanceLogOut.model_validate(log) if log else None)


@router.get("/today-all", summary="Get today's attendance status for all active employees (HR/Admin only)")
async def all_employees_today_status(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role not in (UserRole.super_admin, UserRole.hr_admin, UserRole.manager):
        raise HTTPException(status_code=403, detail="Access denied")

    today = datetime.now(timezone.utc).astimezone(IST).date()

    # Get all active employees
    emp_result = await db.execute(
        select(Employee)
        .where(Employee.is_active == True)
        .order_by(Employee.first_name)
    )
    employees = emp_result.scalars().all()

    # Get today's logs
    log_result = await db.execute(
        select(AttendanceLog).where(AttendanceLog.date == today)
    )
    logs = {l.employee_id: l for l in log_result.scalars().all()}

    result = []
    for emp in employees:
        log = logs.get(emp.id)
        result.append({
            "id": emp.id,
            "emp_code": emp.emp_code,
            "full_name": emp.full_name,
            "role": emp.role.value,
            "status": log.status.value if log else "not_checked_in",
            "punch_in": log.punch_in.isoformat() if log and log.punch_in else None,
            "punch_out": log.punch_out.isoformat() if log and log.punch_out else None,
        })

    return ok(data=result)


@router.get("/today/{employee_id}", summary="Get today's attendance for a specific employee (managers/HR only)")
async def employee_today_status(
    employee_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role == UserRole.employee and current_employee.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    today = datetime.now(timezone.utc).astimezone(IST).date()
    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.date == today,
        )
    )
    log = result.scalar_one_or_none()
    return ok(data=AttendanceLogOut.model_validate(log) if log else None)


@router.get("/my")
async def my_attendance(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(31, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).astimezone(IST).date()
    m = month or today.month
    y = year or today.year
    start = date(y, m, 1)
    end = date(y, m, calendar.monthrange(y, m)[1])

    result = await db.execute(
        select(AttendanceLog)
        .where(
            AttendanceLog.employee_id == current_employee.id,
            AttendanceLog.date >= start,
            AttendanceLog.date <= end,
        )
        .order_by(AttendanceLog.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return ok(data=[AttendanceLogOut.model_validate(l) for l in result.scalars().all()])


@router.get("/summary/{employee_id}")
async def attendance_summary(
    employee_id: str,
    month: int = Query(...),
    year: int = Query(...),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role == UserRole.employee and current_employee.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")

    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])

    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == employee_id,
            AttendanceLog.date >= start,
            AttendanceLog.date <= end,
        )
    )
    logs = result.scalars().all()

    return ok(data=AttendanceSummary(
        employee_id=employee_id, month=month, year=year,
        total_working_days=len([l for l in logs if l.status not in (AttendanceStatus.holiday, AttendanceStatus.week_off)]),
        present=len([l for l in logs if l.status == AttendanceStatus.present]),
        absent=len([l for l in logs if l.status == AttendanceStatus.absent]),
        late=len([l for l in logs if l.status == AttendanceStatus.late]),
        half_day=len([l for l in logs if l.status == AttendanceStatus.half_day]),
        wfh=len([l for l in logs if l.status == AttendanceStatus.wfh]),
        on_leave=len([l for l in logs if l.status == AttendanceStatus.on_leave]),
        total_overtime_minutes=sum(l.overtime_minutes for l in logs),
        attendance_percentage=round(
            len([l for l in logs if l.status in (
                AttendanceStatus.present, AttendanceStatus.late,
                AttendanceStatus.half_day, AttendanceStatus.wfh
            )]) / max(len(logs), 1) * 100, 2
        ),
    ))


@router.patch("/logs/{log_id}/correct")
async def correct_attendance(
    log_id: str,
    body: ManualCorrectionRequest,
    current_employee: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AttendanceLog).where(AttendanceLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found")

    if body.punch_in is not None: log.punch_in = body.punch_in
    if body.punch_out is not None: log.punch_out = body.punch_out
    if body.status is not None: log.status = body.status
    if body.remarks is not None: log.remarks = body.remarks

    log.is_manual_correction = True
    log.corrected_by_id = current_employee.id
    log.corrected_at = datetime.now(timezone.utc)

    return ok(data=AttendanceLogOut.model_validate(log), message="Attendance corrected")


# ─────────────────────────────────────────────────────────────────────────────
# Geofence Zone CRUD  (HR / Admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/geofence-zones")
async def list_geofence_zones(
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GeofenceZone).order_by(GeofenceZone.name))
    zones = result.scalars().all()

    out = []
    for zone in zones:
        count_r = await db.execute(
            select(func.count(Employee.id)).where(
                Employee.geofence_zone_id == zone.id,
                Employee.is_active == True,
            )
        )
        out.append({
            **GeofenceZoneOut.model_validate(zone).model_dump(),
            "employee_count": count_r.scalar() or 0,
        })
    return ok(data=out)


@router.get("/geofence-employees")
async def list_geofence_employees(
    _: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee)
        .where(Employee.is_active == True)
        .order_by(Employee.first_name, Employee.last_name)
    )
    employees = result.scalars().all()
    out = [
        GeofenceEmployeeOut(
            id=emp.id,
            emp_code=emp.emp_code,
            full_name=emp.full_name,
            geofence_zone_id=emp.geofence_zone_id,
            skip_location_check=emp.skip_location_check,
        ).model_dump()
        for emp in employees
    ]
    return ok(data=out)


@router.post("/geofence-zones")
async def create_geofence_zone(
    body: GeofenceZoneCreate,
    _: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    zone = GeofenceZone(
        id=str(uuid.uuid4()),
        name=body.name,
        latitude=Decimal(str(body.latitude)),
        longitude=Decimal(str(body.longitude)),
        radius_meters=body.radius_meters,
        is_active=True,
    )
    db.add(zone)
    await db.flush()
    assigned_count = 0
    if body.employee_ids:
        assigned_count = await assign_employees_to_zone(zone.id, body.employee_ids, db)

    message = "Zone created"
    if body.employee_ids:
        message = f"Zone created and {assigned_count} employee(s) assigned"
    return ok(data=GeofenceZoneOut.model_validate(zone), message=message)


@router.patch("/geofence-zones/{zone_id}")
async def update_geofence_zone(
    zone_id: str,
    body: GeofenceZoneUpdate,
    _: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GeofenceZone).where(GeofenceZone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if body.name is not None: zone.name = body.name
    if body.latitude is not None: zone.latitude = Decimal(str(body.latitude))
    if body.longitude is not None: zone.longitude = Decimal(str(body.longitude))
    if body.radius_meters is not None: zone.radius_meters = body.radius_meters
    if body.is_active is not None: zone.is_active = body.is_active
    assigned_count = None
    if body.employee_ids is not None:
        assigned_count = await assign_employees_to_zone(zone.id, body.employee_ids, db)

    message = "Zone updated"
    if assigned_count is not None:
        message = f"Zone updated and {assigned_count} employee(s) assigned"
    return ok(data=GeofenceZoneOut.model_validate(zone), message=message)


@router.delete("/geofence-zones/{zone_id}")
async def delete_geofence_zone(
    zone_id: str,
    _: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GeofenceZone).where(GeofenceZone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    await db.execute(
        update(Employee).where(Employee.geofence_zone_id == zone_id).values(geofence_zone_id=None)
    )
    await db.delete(zone)
    return ok(message=f"Zone '{zone.name}' deleted and employees unassigned")
