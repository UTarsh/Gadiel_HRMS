import calendar
from datetime import date, datetime
from decimal import Decimal
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.attendance import AttendanceLog, AttendanceStatus
from app.models.employee import Employee, UserRole
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.payroll import Payslip
from app.models.salary import SalaryComponent
from app.models.task import Task, TaskStatus
from app.schemas.common import ok

router = APIRouter(prefix="/reports", tags=["Reports"])

def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _can_access_monthly_report(emp: Employee) -> bool:
    return emp.role in (UserRole.super_admin, UserRole.hr_admin)


def _month_bounds(month: int, year: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


@router.get("/monthly", summary="Monthly management report")
async def monthly_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not _can_access_monthly_report(current_employee):
        raise HTTPException(status_code=403, detail="Access denied")

    month_start, month_end = _month_bounds(month, year)
    start_dt = datetime(year, month, 1)
    if month == 12:
        next_dt = datetime(year + 1, 1, 1)
    else:
        next_dt = datetime(year, month + 1, 1)

    # Tasks summary
    task_result = await db.execute(
        select(Task).where(Task.is_archived == False, Task.created_at >= start_dt, Task.created_at < next_dt)
    )
    tasks = task_result.scalars().all()
    task_counts: Dict[str, int] = {status.value: 0 for status in TaskStatus}
    for t in tasks:
        task_counts[t.status.value] = task_counts.get(t.status.value, 0) + 1
    overdue = len([t for t in tasks if t.due_date and t.due_date < date.today() and t.status != TaskStatus.done])

    # Attendance summary
    attendance_result = await db.execute(
        select(AttendanceLog).where(AttendanceLog.date >= month_start, AttendanceLog.date <= month_end)
    )
    attendance_logs = attendance_result.scalars().all()
    attendance_counts = {status.value: 0 for status in AttendanceStatus}
    for log in attendance_logs:
        attendance_counts[log.status.value] = attendance_counts.get(log.status.value, 0) + 1

    # Leaves summary
    leave_result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.from_date <= month_end, LeaveRequest.to_date >= month_start)
    )
    leaves = leave_result.scalars().all()
    leave_counts = {status.value: 0 for status in LeaveStatus}
    approved_days = Decimal("0")
    for leave in leaves:
        leave_counts[leave.status.value] = leave_counts.get(leave.status.value, 0) + 1
        if leave.status == LeaveStatus.approved:
            approved_days += leave.days

    # Payroll summary
    payslip_result = await db.execute(select(Payslip).where(Payslip.month == month, Payslip.year == year))
    payslips = payslip_result.scalars().all()
    total_gross = sum([_to_float(p.gross_salary) for p in payslips])
    total_deductions = sum([_to_float(p.total_deductions) for p in payslips])
    total_net = sum([_to_float(p.net_salary) for p in payslips])

    # Employee level snapshot
    emp_result = await db.execute(select(Employee).where(Employee.is_active == True))
    employees = emp_result.scalars().all()
    
    today_date = datetime.now().date()
    today_att_result = await db.execute(
        select(AttendanceLog).where(AttendanceLog.date == today_date)
    )
    today_logs = today_att_result.scalars().all()
    
    employee_snapshot = []
    for emp in employees:
        emp_logs = [l for l in attendance_logs if l.employee_id == emp.id]
        days_worked = Decimal("0")
        for log in emp_logs:
            if log.status in (AttendanceStatus.present, AttendanceStatus.late, AttendanceStatus.wfh):
                days_worked += Decimal("1")
            elif log.status == AttendanceStatus.half_day:
                days_worked += Decimal("0.5")

        emp_leaves = [
            lv for lv in leaves
            if lv.employee_id == emp.id and lv.status == LeaveStatus.approved
        ]
        leave_days = sum([_to_float(lv.days) for lv in emp_leaves])

        emp_tasks = [t for t in tasks if t.assigned_to_id == emp.id]
        open_tasks = len([t for t in emp_tasks if t.status != TaskStatus.done])
        done_tasks = len([t for t in emp_tasks if t.status == TaskStatus.done])

        emp_payslip = next((p for p in payslips if p.employee_id == emp.id), None)
        if emp_payslip:
            net_salary = _to_float(emp_payslip.net_salary)
        else:
            salary_result = await db.execute(
                select(SalaryComponent)
                .where(SalaryComponent.employee_id == emp.id)
                .order_by(SalaryComponent.is_current.desc(), SalaryComponent.effective_from.desc())
                .limit(1)
            )
            comp = salary_result.scalar_one_or_none()
            net_salary = _to_float(comp.net_salary if comp else 0)

        emp_today_log = next((l for l in today_logs if l.employee_id == emp.id), None)
        today_status = emp_today_log.status.value if emp_today_log else "absent"

        employee_snapshot.append(
            {
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "role": emp.role.value if emp.role else None,
                "days_worked": float(days_worked),
                "approved_leave_days": leave_days,
                "open_tasks": open_tasks,
                "completed_tasks": done_tasks,
                "net_salary": net_salary,
                "today_status": today_status,
            }
        )

    return ok(
        data={
            "month": month,
            "year": year,
            "tasks": {
                "total": len(tasks),
                "by_status": task_counts,
                "overdue": overdue,
            },
            "attendance": {
                "total_logs": len(attendance_logs),
                "by_status": attendance_counts,
            },
            "leaves": {
                "total_requests": len(leaves),
                "by_status": leave_counts,
                "approved_days": float(approved_days),
            },
            "payroll": {
                "generated_payslips": len(payslips),
                "total_gross": round(total_gross, 2),
                "total_deductions": round(total_deductions, 2),
                "total_net": round(total_net, 2),
            },
            "employee_snapshot": employee_snapshot,
        }
    )
