import calendar
import os
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.attendance import AttendanceLog, AttendanceStatus
from app.models.employee import Employee, UserRole
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.notification import Notification, NotificationType
from app.models.payroll import PayrollRun, PayrollStatus, Payslip, PayslipStatus
from app.models.salary import SalaryComponent
from app.models.salary_tracker import SalaryTracker, SalaryTrackerRecord, SalaryRecordType
from app.schemas.common import ok
from app.schemas.compensation import (
    PayslipGenerateRequest,
    SalaryTrackerUpdateRequest,
    SalaryTrackerRecordCreateRequest,
)

router = APIRouter(prefix="/compensation", tags=["Compensation"])

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAYSLIP_DIR = os.path.join(_BACKEND_ROOT, "uploads", "payslips")
os.makedirs(PAYSLIP_DIR, exist_ok=True)


def _dec(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _to_float(value: Decimal | float | int | None) -> float:
    return float(_dec(value))


def _month_bounds(month: int, year: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


def _days_in_month(month: int, year: int) -> int:
    return calendar.monthrange(year, month)[1]


def _can_manage_payslips(emp: Employee) -> bool:
    return emp.role in (UserRole.super_admin, UserRole.hr_admin)


async def _current_salary_component(employee_id: str, as_of_date: date, db: AsyncSession) -> Optional[SalaryComponent]:
    q = await db.execute(
        select(SalaryComponent)
        .where(
            SalaryComponent.employee_id == employee_id,
            SalaryComponent.effective_from <= as_of_date,
            (SalaryComponent.effective_to == None) | (SalaryComponent.effective_to >= as_of_date),
        )
        .order_by(SalaryComponent.effective_from.desc())
        .limit(1)
    )
    row = q.scalar_one_or_none()
    if row:
        return row

    fallback = await db.execute(
        select(SalaryComponent)
        .where(SalaryComponent.employee_id == employee_id)
        .order_by(SalaryComponent.is_current.desc(), SalaryComponent.effective_from.desc())
        .limit(1)
    )
    return fallback.scalar_one_or_none()


async def _get_or_create_tracker(employee_id: str, month: int, year: int, db: AsyncSession) -> SalaryTracker:
    result = await db.execute(
        select(SalaryTracker).where(
            SalaryTracker.employee_id == employee_id,
            SalaryTracker.month == month,
            SalaryTracker.year == year,
        )
    )
    tracker = result.scalar_one_or_none()
    if tracker:
        return tracker

    tracker = SalaryTracker(
        employee_id=employee_id,
        month=month,
        year=year,
        planned_budget=Decimal("0"),
        spent_amount=Decimal("0"),
        notes=None,
    )
    db.add(tracker)
    await db.flush()
    return tracker


def _write_payslip_html(payslip: Payslip, employee_name: str) -> str:
    file_name = f"{payslip.employee_id}_{payslip.year}_{payslip.month:02d}.html"
    file_path = os.path.join(PAYSLIP_DIR, file_name)

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip {payslip.month:02d}/{payslip.year}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }}
    h1 {{ margin: 0 0 4px; }}
    .sub {{ color: #64748b; margin-bottom: 16px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 16px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; }}
    th {{ background: #eff6ff; }}
    .total {{ font-weight: bold; }}
  </style>
</head>
<body>
  <h1>Gadiel Technologies - Payslip</h1>
  <div class="sub">{employee_name} | {payslip.month:02d}/{payslip.year}</div>
  <table>
    <tr><th>Gross Salary</th><td>{payslip.gross_salary}</td></tr>
    <tr><th>Total Deductions</th><td>{payslip.total_deductions}</td></tr>
    <tr><th class="total">Net Salary</th><td class="total">{payslip.net_salary}</td></tr>
    <tr><th>Days Worked</th><td>{payslip.days_worked}</td></tr>
    <tr><th>Days Absent</th><td>{payslip.days_absent}</td></tr>
    <tr><th>Days on Leave</th><td>{payslip.days_on_leave}</td></tr>
  </table>
</body>
</html>"""

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html)
    return f"/uploads/payslips/{file_name}"


def _payslip_to_dict(p: Payslip, employee_name: str) -> dict:
    return {
        "id": p.id,
        "employee_id": p.employee_id,
        "employee_name": employee_name,
        "month": p.month,
        "year": p.year,
        "status": p.status.value if p.status else None,
        "gross_salary": _to_float(p.gross_salary),
        "total_deductions": _to_float(p.total_deductions),
        "net_salary": _to_float(p.net_salary),
        "days_worked": _to_float(p.days_worked),
        "days_absent": p.days_absent,
        "days_on_leave": _to_float(p.days_on_leave),
        "days_lwp": _to_float(p.days_lwp),
        "pdf_url": p.pdf_url,
        "created_at": p.created_at,
    }


def _salary_record_to_dict(r: SalaryTrackerRecord) -> dict:
    return {
        "id": r.id,
        "month": r.month,
        "year": r.year,
        "record_date": r.record_date.isoformat(),
        "title": r.title,
        "amount": _to_float(r.amount),
        "record_type": r.record_type.value if r.record_type else None,
        "notes": r.notes,
        "created_at": r.created_at,
    }


@router.get("/overview", summary="Get my salary overview")
async def salary_overview(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    m = month or today.month
    y = year or today.year
    _, end = _month_bounds(m, y)
    days_in_month = _days_in_month(m, y)

    component = await _current_salary_component(current_employee.id, end, db)
    tracker = await _get_or_create_tracker(current_employee.id, m, y, db)
    records_result = await db.execute(
        select(SalaryTrackerRecord).where(
            SalaryTrackerRecord.employee_id == current_employee.id,
            SalaryTrackerRecord.month == m,
            SalaryTrackerRecord.year == y,
        )
    )
    records = records_result.scalars().all()
    expense_total = sum([_to_float(r.amount) for r in records if r.record_type == SalaryRecordType.expense])
    income_total = sum([_to_float(r.amount) for r in records if r.record_type in (SalaryRecordType.income, SalaryRecordType.savings)])

    if component is None:
        return ok(
            data={
                "month": m,
                "year": y,
                "salary_available": False,
                "salary": None,
                "tracker": {
                    "planned_budget": _to_float(tracker.planned_budget),
                    "spent_amount": _to_float(tracker.spent_amount),
                    "remaining_budget": _to_float(_dec(tracker.planned_budget) - _dec(tracker.spent_amount)),
                    "notes": tracker.notes,
                    "income_total": income_total,
                    "expense_total": expense_total,
                    "records_count": len(records),
                },
                "can_generate_payslips": _can_manage_payslips(current_employee),
            },
            message="Salary details are not configured yet",
        )

    gross = _dec(component.gross_salary)
    net = _dec(component.net_salary)
    ctc_annual = (gross * Decimal("12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    ctc_monthly = gross

    payslip_res = await db.execute(
        select(Payslip)
        .where(
            Payslip.employee_id == current_employee.id,
            Payslip.month == m,
            Payslip.year == y,
        )
        .order_by(Payslip.created_at.desc())
        .limit(1)
    )
    latest_payslip = payslip_res.scalar_one_or_none()

    return ok(
        data={
            "month": m,
            "year": y,
            "salary_available": True,
            "salary": {
                "gross_salary": _to_float(gross),
                "net_salary": _to_float(net),
                "total_deductions": _to_float(component.total_deductions),
                "basic_salary": _to_float(component.basic_salary),
                "hra": _to_float(component.hra),
                "special_allowance": _to_float(component.special_allowance),
                "ctc_monthly": _to_float(ctc_monthly),
                "ctc_annual": _to_float(ctc_annual),
                "progress_percent": round((today.day if (m == today.month and y == today.year) else days_in_month) / max(days_in_month, 1) * 100, 2),
            },
            "tracker": {
                "planned_budget": _to_float(tracker.planned_budget),
                "spent_amount": _to_float(tracker.spent_amount),
                "remaining_budget": _to_float(_dec(tracker.planned_budget) - _dec(tracker.spent_amount)),
                "notes": tracker.notes,
                "income_total": income_total,
                "expense_total": expense_total,
                "records_count": len(records),
            },
            "latest_payslip": _payslip_to_dict(latest_payslip, current_employee.full_name) if latest_payslip else None,
            "can_generate_payslips": _can_manage_payslips(current_employee),
        }
    )


@router.put("/tracker", summary="Update my salary tracker")
async def update_salary_tracker(
    body: SalaryTrackerUpdateRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    tracker = await _get_or_create_tracker(current_employee.id, body.month, body.year, db)
    if body.planned_budget is not None:
        tracker.planned_budget = _dec(body.planned_budget)
    if body.spent_amount is not None:
        tracker.spent_amount = _dec(body.spent_amount)
    if body.notes is not None:
        tracker.notes = body.notes

    return ok(
        data={
            "month": tracker.month,
            "year": tracker.year,
            "planned_budget": _to_float(tracker.planned_budget),
            "spent_amount": _to_float(tracker.spent_amount),
            "remaining_budget": _to_float(_dec(tracker.planned_budget) - _dec(tracker.spent_amount)),
            "notes": tracker.notes,
        },
        message="Salary tracker updated",
    )


@router.get("/tracker/records", summary="List salary tracker records for month/year")
async def list_salary_records(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SalaryTrackerRecord)
        .where(
            SalaryTrackerRecord.employee_id == current_employee.id,
            SalaryTrackerRecord.month == month,
            SalaryTrackerRecord.year == year,
        )
        .order_by(SalaryTrackerRecord.record_date.desc(), SalaryTrackerRecord.created_at.desc())
    )
    records = result.scalars().all()
    return ok(data=[_salary_record_to_dict(r) for r in records])


@router.post("/tracker/records", summary="Add salary tracker record")
async def add_salary_record(
    body: SalaryTrackerRecordCreateRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    record_type = SalaryRecordType(body.record_type)
    tracker = await _get_or_create_tracker(current_employee.id, body.month, body.year, db)

    rec = SalaryTrackerRecord(
        employee_id=current_employee.id,
        month=body.month,
        year=body.year,
        record_date=body.record_date,
        title=body.title.strip(),
        amount=_dec(body.amount),
        record_type=record_type,
        notes=body.notes,
    )
    db.add(rec)
    await db.flush()

    if record_type == SalaryRecordType.expense:
        tracker.spent_amount = _dec(tracker.spent_amount) + _dec(body.amount)
    elif record_type in (SalaryRecordType.income, SalaryRecordType.savings):
        tracker.planned_budget = _dec(tracker.planned_budget) + _dec(body.amount)

    return ok(data=_salary_record_to_dict(rec), message="Salary record saved")


@router.get("/payslips/mine", summary="List my payslips")
async def my_payslips(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    q = select(Payslip).where(Payslip.employee_id == current_employee.id)
    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    rows = await db.execute(
        q.order_by(Payslip.year.desc(), Payslip.month.desc(), Payslip.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    slips = rows.scalars().all()

    return {
        "success": True,
        "message": "Success",
        "data": [_payslip_to_dict(p, current_employee.full_name) for p in slips],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/payslips", summary="List payslips for all employees")
async def list_all_payslips(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    employee_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_payslips(current_employee):
        raise HTTPException(status_code=403, detail="Access denied")

    q = select(Payslip).options(selectinload(Payslip.employee))
    if month:
        q = q.where(Payslip.month == month)
    if year:
        q = q.where(Payslip.year == year)
    if employee_id:
        q = q.where(Payslip.employee_id == employee_id)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    rows = await db.execute(
        q.order_by(Payslip.year.desc(), Payslip.month.desc(), Payslip.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    slips = rows.scalars().all()

    return {
        "success": True,
        "message": "Success",
        "data": [_payslip_to_dict(p, p.employee.full_name if p.employee else "") for p in slips],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/payslips/{payslip_id}", summary="Get payslip detail")
async def get_payslip_detail(
    payslip_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payslip).options(selectinload(Payslip.employee)).where(Payslip.id == payslip_id)
    )
    payslip = result.scalar_one_or_none()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")

    if not _can_manage_payslips(current_employee) and payslip.employee_id != current_employee.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ok(data=_payslip_to_dict(payslip, payslip.employee.full_name if payslip.employee else ""))


@router.post("/payslips/generate", summary="Generate monthly payslips")
async def generate_payslips(
    body: PayslipGenerateRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_payslips(current_employee):
        raise HTTPException(status_code=403, detail="Only authorized payroll users can generate payslips")

    month_start, month_end = _month_bounds(body.month, body.year)
    days_in_month = _days_in_month(body.month, body.year)

    run_result = await db.execute(
        select(PayrollRun).where(PayrollRun.month == body.month, PayrollRun.year == body.year).limit(1)
    )
    payroll_run = run_result.scalar_one_or_none()
    if payroll_run is None:
        payroll_run = PayrollRun(
            month=body.month,
            year=body.year,
            status=PayrollStatus.processing,
            processed_by_id=current_employee.id,
            processed_at=datetime.now(timezone.utc),
        )
        db.add(payroll_run)
        await db.flush()
    else:
        payroll_run.status = PayrollStatus.processing
        payroll_run.processed_by_id = current_employee.id
        payroll_run.processed_at = datetime.now(timezone.utc)

    emp_result = await db.execute(
        select(Employee).where(Employee.is_active == True).order_by(Employee.first_name, Employee.last_name)
    )
    employees = emp_result.scalars().all()

    generated = 0
    skipped: list[dict] = []

    for emp in employees:
        component = await _current_salary_component(emp.id, month_end, db)
        if component is None:
            skipped.append({"employee_id": emp.id, "employee_name": emp.full_name, "reason": "Salary not configured"})
            continue

        logs_result = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.date >= month_start,
                AttendanceLog.date <= month_end,
            )
        )
        logs = logs_result.scalars().all()

        days_worked = Decimal("0")
        days_absent = 0
        for log in logs:
            if log.status in (AttendanceStatus.present, AttendanceStatus.late, AttendanceStatus.wfh):
                days_worked += Decimal("1")
            elif log.status == AttendanceStatus.half_day:
                days_worked += Decimal("0.5")
            elif log.status == AttendanceStatus.absent:
                days_absent += 1

        leaves_result = await db.execute(
            select(func.coalesce(func.sum(LeaveRequest.days), 0)).where(
                LeaveRequest.employee_id == emp.id,
                LeaveRequest.status == LeaveStatus.approved,
                LeaveRequest.from_date <= month_end,
                LeaveRequest.to_date >= month_start,
            )
        )
        days_on_leave = _dec(leaves_result.scalar_one() or 0)
        days_lwp = Decimal(str(days_absent))

        gross = _dec(component.gross_salary)
        base_net = _dec(component.net_salary)
        per_day_gross = gross / Decimal(str(max(days_in_month, 1)))
        lwp_deduction = (per_day_gross * days_lwp).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        net_salary = (base_net - lwp_deduction).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if net_salary < 0:
            net_salary = Decimal("0.00")

        total_deductions = (_dec(component.total_deductions) + lwp_deduction).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        existing_result = await db.execute(
            select(Payslip).where(
                Payslip.payroll_run_id == payroll_run.id,
                Payslip.employee_id == emp.id,
            )
        )
        payslip = existing_result.scalar_one_or_none()
        if payslip is None:
            payslip = Payslip(
                payroll_run_id=payroll_run.id,
                employee_id=emp.id,
                month=body.month,
                year=body.year,
            )
            db.add(payslip)

        payslip.working_days_in_month = days_in_month
        payslip.days_worked = days_worked
        payslip.days_absent = days_absent
        payslip.days_on_leave = days_on_leave
        payslip.days_lwp = days_lwp
        payslip.basic_salary = _dec(component.basic_salary)
        payslip.hra = _dec(component.hra)
        payslip.transport_allowance = _dec(component.transport_allowance)
        payslip.special_allowance = _dec(component.special_allowance)
        payslip.medical_allowance = _dec(component.medical_allowance)
        payslip.other_allowances = Decimal("0")
        payslip.lwp_deduction = lwp_deduction
        payslip.gross_salary = gross
        payslip.pf_employee = _dec(component.pf_employee)
        payslip.pf_employer = _dec(component.pf_employer)
        payslip.esic_employee = _dec(component.esic_employee)
        payslip.esic_employer = _dec(component.esic_employer)
        payslip.professional_tax = _dec(component.professional_tax)
        payslip.tds = _dec(component.tds)
        payslip.other_deductions = lwp_deduction
        payslip.total_deductions = total_deductions
        payslip.net_salary = net_salary
        payslip.status = PayslipStatus.finalized
        payslip.remarks = "Generated via HRMS salary module"

        await db.flush()
        payslip.pdf_url = _write_payslip_html(payslip, emp.full_name)

        db.add(
            Notification(
                employee_id=emp.id,
                title=f"Payslip generated for {body.month:02d}/{body.year}",
                body=f"Your monthly payslip is now available. Net salary: {net_salary}",
                notification_type=NotificationType.announcement,
                reference_id=payslip.id,
                reference_type="payslip",
            )
        )
        generated += 1

    totals_result = await db.execute(
        select(
            func.count(Payslip.id),
            func.coalesce(func.sum(Payslip.gross_salary), 0),
            func.coalesce(func.sum(Payslip.total_deductions), 0),
            func.coalesce(func.sum(Payslip.net_salary), 0),
        ).where(Payslip.payroll_run_id == payroll_run.id)
    )
    total_count, total_gross, total_deductions, total_net = totals_result.one()
    payroll_run.total_employees = int(total_count or 0)
    payroll_run.total_gross = _dec(total_gross)
    payroll_run.total_deductions = _dec(total_deductions)
    payroll_run.total_net = _dec(total_net)
    payroll_run.status = PayrollStatus.approved
    payroll_run.approved_by_id = current_employee.id
    payroll_run.approved_at = datetime.now(timezone.utc)

    return ok(
        data={
            "payroll_run_id": payroll_run.id,
            "month": body.month,
            "year": body.year,
            "generated_count": generated,
            "skipped": skipped,
            "summary": {
                "total_employees": payroll_run.total_employees,
                "total_gross": _to_float(payroll_run.total_gross),
                "total_deductions": _to_float(payroll_run.total_deductions),
                "total_net": _to_float(payroll_run.total_net),
            },
        },
        message="Payslips generated successfully",
    )


@router.post("/payslips/{payslip_id}/upload", summary="Upload a custom PDF for a payslip")
async def upload_payslip_pdf(
    payslip_id: str,
    file: UploadFile = File(...),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_payslips(current_employee):
        raise HTTPException(status_code=403, detail="Only authorized payroll users can upload payslips")
    
    result = await db.execute(select(Payslip).where(Payslip.id == payslip_id))
    payslip = result.scalar_one_or_none()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
        
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    # Generate unique filename
    safe_name = f"{payslip.employee_id}_{payslip.year}_{payslip.month:02d}_custom.pdf"
    file_path = os.path.join(PAYSLIP_DIR, safe_name)
    
    # Write to disk
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
        
    payslip.pdf_url = f"/uploads/payslips/{safe_name}"
    payslip.status = PayslipStatus.finalized
    payslip.remarks = "Custom PDF uploaded via HRMS"

    await db.flush()
    return ok(data=_payslip_to_dict(payslip, ""), message="Payslip PDF uploaded successfully")


@router.patch("/salary/{employee_id}", summary="Update salary components for an employee (HR/Admin only)")
async def update_salary_component(
    employee_id: str,
    body: dict,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role not in (UserRole.super_admin, UserRole.hr_admin):
        raise HTTPException(status_code=403, detail="Only HR administrators can modify salary data")

    today = date.today()
    salary = await _current_salary_component(employee_id, today, db)
    if not salary:
        raise HTTPException(status_code=404, detail="No salary record found for this employee")

    updatable_fields = [
        "basic_salary", "hra", "transport_allowance", "special_allowance",
        "medical_allowance", "gross_salary", "net_salary", "total_deductions",
    ]
    for field in updatable_fields:
        if field in body:
            setattr(salary, field, Decimal(str(body[field])))

    # Recalculate annual CTC from gross if provided
    if "annual_ctc" in body:
        salary.gross_salary = Decimal(str(body["annual_ctc"])) / 12

    return ok(data={
        "employee_id": employee_id,
        "basic_salary": float(salary.basic_salary),
        "hra": float(salary.hra),
        "special_allowance": float(salary.special_allowance),
        "gross_salary": float(salary.gross_salary),
        "net_salary": float(salary.net_salary),
        "annual_ctc": float(salary.gross_salary) * 12,
    }, message="Salary updated")
