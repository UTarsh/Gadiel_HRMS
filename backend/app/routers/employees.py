from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.models.audit_log import AuditAction
from app.models.employee import Department, Designation, Employee, UserRole
from app.schemas.common import ok, fail
from app.schemas.employee import EmployeeCreate, EmployeeDetailOut, EmployeeOut, EmployeeUpdate
from app.middleware.auth import get_current_employee, require_hr, require_manager
from app.utils.audit import write_audit_log
from app.utils.security import hash_password

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", summary="List employees (paginated)")
async def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    query = select(Employee).where(Employee.is_active == True)

    # HR/admin see all; managers see only their direct reports; employees see all (basic info)
    if current_employee.role == UserRole.manager:
        query = query.where(Employee.reporting_manager_id == current_employee.id)

    if department_id:
        query = query.where(Employee.department_id == department_id)
    if search:
        query = query.where(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.emp_code.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    if status:
        query = query.where(Employee.employment_status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.options(
        selectinload(Employee.department), selectinload(Employee.designation)
    ).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    employees = result.scalars().all()

    return {
        "success": True,
        "message": "Success",
        "data": [EmployeeOut.model_validate(e) for e in employees],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("", summary="Create new employee (HR only)", status_code=201)
async def create_employee(
    body: EmployeeCreate,
    current_employee: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    # Check emp_code and email uniqueness
    existing = await db.execute(
        select(Employee).where(
            (Employee.emp_code == body.emp_code) | (Employee.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee code or email already exists")

    employee = Employee(
        **body.model_dump(exclude={"password"}),
        password_hash=hash_password(body.password),
    )
    db.add(employee)
    await db.flush()
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.id == employee.id)
    )
    employee = result.scalar_one()
    await write_audit_log(
        db=db,
        action=AuditAction.created,
        entity_type="employee",
        entity_id=employee.id,
        performed_by_id=current_employee.id,
        description=f"Employee {employee.emp_code} ({employee.full_name}) created by {current_employee.full_name}",
    )
    return ok(data=EmployeeDetailOut.model_validate(employee), message="Employee created")


@router.get("/me", summary="Get own full profile")
async def get_my_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.id == current_employee.id)
    )
    employee = result.scalar_one()
    return ok(data=EmployeeDetailOut.model_validate(employee))


@router.get("/org-chart", summary="Get full organization chart")
async def get_org_chart(
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.profile),
        )
        .where(Employee.is_active == True)
        .order_by(Employee.first_name, Employee.last_name)
    )
    employees = result.scalars().all()
    data = []
    for e in employees:
        row = EmployeeOut.model_validate(e).model_dump(mode="json")
        row["ghibli_image_url"] = e.profile.ghibli_image_url if e.profile else None
        data.append(row)
    return ok(data=data)


@router.get("/{employee_id}", summary="Get employee by ID")
async def get_employee(
    employee_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # HR / admin see full details; everyone else sees the public summary
    if current_employee.role in (UserRole.hr_admin, UserRole.super_admin):
        return ok(data=EmployeeDetailOut.model_validate(employee))
    return ok(data=EmployeeOut.model_validate(employee))


@router.patch("/{employee_id}", summary="Update employee")
async def update_employee(
    employee_id: str,
    body: EmployeeUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    # Employees can update only their own profile (limited fields)
    if current_employee.role == UserRole.employee and current_employee.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = body.model_dump(exclude_unset=True)

    # Employees cannot change org fields — only HR can
    if current_employee.role == UserRole.employee:
        restricted = {"department_id", "designation_id", "employment_type", "employment_status", "salary_level_id", "grade_level"}
        for field in restricted:
            update_data.pop(field, None)

    for key, val in update_data.items():
        setattr(employee, key, val)

    await db.flush()
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.id == employee_id)
    )
    employee = result.scalar_one()
    await write_audit_log(
        db=db,
        action=AuditAction.updated,
        entity_type="employee",
        entity_id=employee_id,
        performed_by_id=current_employee.id,
        new_values={k: str(v) for k, v in update_data.items()},
        description=f"Employee {employee.emp_code} updated by {current_employee.full_name}",
    )
    return ok(data=EmployeeDetailOut.model_validate(employee), message="Updated successfully")


@router.delete("/{employee_id}", summary="Deactivate employee (HR only)")
async def deactivate_employee(
    employee_id: str,
    current_employee: Employee = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Employee).where(Employee.id == employee_id).values(is_active=False, employment_status="terminated")
    )
    # Note: is_active=False in the DB immediately blocks the employee on next request
    # via the middleware's Employee lookup — no token blacklisting needed here.
    await write_audit_log(
        db=db,
        action=AuditAction.deleted,
        entity_type="employee",
        entity_id=employee_id,
        performed_by_id=current_employee.id,
        description=f"Employee {employee_id} deactivated/terminated by {current_employee.full_name}",
    )
    return ok(message="Employee deactivated")


# ─── Departments ─────────────────────────────────────────────────────────────
@router.get("/departments/all", summary="List all departments")
async def list_departments(
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Department).where(Department.is_active == True))
    depts = result.scalars().all()
    from app.schemas.employee import DepartmentOut
    return ok(data=[DepartmentOut.model_validate(d) for d in depts])


# ─── Designations ─────────────────────────────────────────────────────────────
@router.get("/designations/all", summary="List all designations")
async def list_designations(
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Designation).where(Designation.is_active == True))
    desigs = result.scalars().all()
    from app.schemas.employee import DesignationOut
    return ok(data=[DesignationOut.model_validate(d) for d in desigs])
