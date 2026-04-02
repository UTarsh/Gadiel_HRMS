from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.models.audit_log import AuditAction
from app.models.employee import Employee, UserRole
from app.models.leave import LeaveBalance, LeaveRequest, LeaveStatus, LeaveType
from app.schemas.common import ok
from app.schemas.leave import LeaveActionRequest, LeaveApplyRequest, LeaveBalanceOut, LeaveRequestOut
from app.middleware.auth import get_current_employee, require_manager
from app.services.leave_service import apply_leave
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/leaves", tags=["Leave Management"])


@router.get("/types", summary="Get all leave types")
async def list_leave_types(
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveType).where(LeaveType.is_active == True))
    from app.schemas.leave import LeaveTypeOut
    return ok(data=[LeaveTypeOut.model_validate(lt) for lt in result.scalars().all()])


@router.get("/balance", summary="Get own leave balance for current year")
async def my_leave_balance(
    year: Optional[int] = Query(None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    y = year or date.today().year
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.employee_id == current_employee.id, LeaveBalance.year == y)
    )
    balances = result.scalars().all()
    return ok(data=[LeaveBalanceOut.model_validate(b) for b in balances])


@router.get("/balance/{employee_id}", summary="Get leave balance for specific employee (HR/Manager)")
async def employee_leave_balance(
    employee_id: str,
    year: Optional[int] = Query(None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role == UserRole.employee and current_employee.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")

    from datetime import date
    y = year or date.today().year
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.employee_id == employee_id, LeaveBalance.year == y)
    )
    return ok(data=[LeaveBalanceOut.model_validate(b) for b in result.scalars().all()])


@router.post("/apply", summary="Apply for leave", status_code=201)
async def apply_for_leave(
    body: LeaveApplyRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    try:
        leave_req = await apply_leave(
            employee=current_employee,
            leave_type_id=body.leave_type_id,
            from_date=body.from_date,
            to_date=body.to_date,
            is_half_day=body.is_half_day,
            reason=body.reason,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await write_audit_log(
        db=db,
        action=AuditAction.created,
        entity_type="leave_request",
        entity_id=leave_req.id,
        performed_by_id=current_employee.id,
        description=f"Leave applied: {leave_req.from_date} to {leave_req.to_date}, status={leave_req.status.value}",
    )
    return ok(data=LeaveRequestOut.model_validate(leave_req), message=f"Leave request {leave_req.status.value}")


@router.get("/my", summary="My leave history")
async def my_leaves(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.employee_id == current_employee.id)
        .order_by(LeaveRequest.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    leaves = result.scalars().all()
    return ok(data=[LeaveRequestOut.model_validate(l) for l in leaves])


@router.get("/team", summary="Team pending leaves (Manager/HR view)")
async def team_leaves(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role == UserRole.manager:
        # Managers see direct reports only
        emp_result = await db.execute(
            select(Employee.id).where(Employee.reporting_manager_id == current_employee.id)
        )
        team_ids = [r[0] for r in emp_result.all()]
        query = select(LeaveRequest).where(LeaveRequest.employee_id.in_(team_ids))
    else:
        query = select(LeaveRequest)

    if status:
        query = query.where(LeaveRequest.status == status)

    query = query.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return ok(data=[LeaveRequestOut.model_validate(l) for l in result.scalars().all()])


@router.patch("/{leave_id}/action", summary="Approve or reject a leave request")
async def action_on_leave(
    leave_id: str,
    body: LeaveActionRequest,
    current_employee: Employee = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave_req = result.scalar_one_or_none()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave_req.status != LeaveStatus.pending:
        raise HTTPException(status_code=400, detail=f"Leave is already {leave_req.status.value}")

    if body.action == "approve":
        leave_req.status = LeaveStatus.approved
        leave_req.approved_by_id = current_employee.id
        leave_req.approved_at = datetime.now(timezone.utc)

        # Move balance from pending → used
        bal_result = await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.leave_type_id == leave_req.leave_type_id,
                LeaveBalance.year == leave_req.from_date.year,
            )
        )
        balance = bal_result.scalar_one_or_none()
        if balance:
            balance.pending -= leave_req.days
            balance.used += leave_req.days

    elif body.action == "reject":
        leave_req.status = LeaveStatus.rejected
        leave_req.rejection_reason = body.rejection_reason

        # Release pending balance
        bal_result = await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.leave_type_id == leave_req.leave_type_id,
                LeaveBalance.year == leave_req.from_date.year,
            )
        )
        balance = bal_result.scalar_one_or_none()
        if balance:
            balance.pending -= leave_req.days
    else:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    audit_action = AuditAction.approved if body.action == "approve" else AuditAction.rejected
    await write_audit_log(
        db=db,
        action=audit_action,
        entity_type="leave_request",
        entity_id=leave_req.id,
        performed_by_id=current_employee.id,
        description=f"Leave {body.action}d by {current_employee.full_name}"
                    + (f": {body.rejection_reason}" if body.action == "reject" and body.rejection_reason else ""),
    )
    return ok(data=LeaveRequestOut.model_validate(leave_req), message=f"Leave {body.action}d")


@router.patch("/{leave_id}/cancel", summary="Cancel own pending leave")
async def cancel_leave(
    leave_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).where(
            LeaveRequest.id == leave_id,
            LeaveRequest.employee_id == current_employee.id,
        )
    )
    leave_req = result.scalar_one_or_none()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave_req.status not in (LeaveStatus.pending, LeaveStatus.approved):
        raise HTTPException(status_code=400, detail="Cannot cancel this leave")

    # Return balance
    bal_result = await db.execute(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == current_employee.id,
            LeaveBalance.leave_type_id == leave_req.leave_type_id,
            LeaveBalance.year == leave_req.from_date.year,
        )
    )
    balance = bal_result.scalar_one_or_none()
    if balance:
        if leave_req.status == LeaveStatus.pending:
            balance.pending -= leave_req.days
        else:
            balance.used -= leave_req.days

    leave_req.status = LeaveStatus.cancelled
    await write_audit_log(
        db=db,
        action=AuditAction.cancelled,
        entity_type="leave_request",
        entity_id=leave_req.id,
        performed_by_id=current_employee.id,
        description="Leave cancelled by employee",
    )
    return ok(message="Leave cancelled")


@router.patch("/balance/{balance_id}", summary="Update leave balance (super_admin only)")
async def update_leave_balance(
    balance_id: str,
    body: dict,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if current_employee.role not in (UserRole.super_admin, UserRole.hr_admin):
        raise HTTPException(status_code=403, detail="Only super admins can modify leave balances")

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.id == balance_id)
    )
    balance = result.scalar_one_or_none()
    if not balance:
        raise HTTPException(status_code=404, detail="Leave balance not found")

    if "total_entitled" in body:
        val = float(body["total_entitled"])
        if val < 0:
            raise HTTPException(status_code=400, detail="total_entitled cannot be negative")
        balance.total_entitled = val
    if "available" in body:
        val = float(body["available"])
        if val < 0:
            raise HTTPException(status_code=400, detail="available cannot be negative")
        balance.available = val

    await write_audit_log(
        db=db,
        action=AuditAction.updated,
        entity_type="leave_balance",
        entity_id=balance_id,
        performed_by_id=current_employee.id,
        description=f"Leave balance manually updated by {current_employee.full_name}",
    )
    return ok(data=LeaveBalanceOut.model_validate(balance), message="Leave balance updated")
