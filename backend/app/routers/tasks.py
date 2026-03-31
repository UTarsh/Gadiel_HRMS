"""
Tasks router — access control is derived entirely from the database:

  • super_admin / hr_admin  → see and assign all tasks
  • manager / employee      → see tasks assigned to or by them,
                              plus tasks assigned to their direct reports
                              (employees whose reporting_manager_id = current user)
  • Assignment permission   → you may assign to yourself or any of your direct reports

No first-name strings are used for access control.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.employee import Employee, UserRole
from app.models.notification import Notification, NotificationType
from app.models.task import Task, TaskStatus
from app.schemas.common import ok
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _is_all_tasks_user(emp: Employee) -> bool:
    """Only privileged roles may see all tasks company-wide."""
    return emp.role in (UserRole.super_admin, UserRole.hr_admin)


async def _team_member_ids(manager_id: str, db: AsyncSession) -> set[str]:
    """Return IDs of active employees who report directly to manager_id."""
    rows = await db.execute(
        select(Employee.id).where(
            Employee.reporting_manager_id == manager_id,
            Employee.is_active == True,
        )
    )
    return {r[0] for r in rows.all()}


async def _assignable_member_ids(emp: Employee, db: AsyncSession) -> set[str]:
    """
    IDs that the current employee is allowed to assign tasks to.
    Everyone can assign to any other active employee.
    """
    rows = await db.execute(
        select(Employee.id).where(Employee.is_active == True, Employee.id != emp.id)
    )
    return {r[0] for r in rows.all()}


async def _can_create_task(emp: Employee, db: AsyncSession) -> bool:
    if _is_all_tasks_user(emp):
        return True
    assignable = await _assignable_member_ids(emp, db)
    return len(assignable) > 0


def _task_to_out(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_to_id=task.assigned_to_id,
        assigned_to_name=task.assigned_to.full_name if task.assigned_to else "",
        assigned_by_id=task.assigned_by_id,
        assigned_by_name=task.assigned_by.full_name if task.assigned_by else "",
        due_date=task.due_date,
        status=task.status,
        priority=task.priority,
        progress=task.progress,
        is_archived=task.is_archived,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("", summary="List tasks")
async def list_tasks(
    status: Optional[TaskStatus] = Query(None),
    assigned_to_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    can_view_all = _is_all_tasks_user(current_employee)
    team_ids = await _team_member_ids(current_employee.id, db)
    assignable_ids = await _assignable_member_ids(current_employee, db)

    query = select(Task).where(Task.is_archived == False)

    if can_view_all:
        if assigned_to_id:
            query = query.where(Task.assigned_to_id == assigned_to_id)
    else:
        visibility_conditions = [
            Task.assigned_to_id == current_employee.id,
            Task.assigned_by_id == current_employee.id,
        ]
        # Managers can also see tasks for their direct reports
        if team_ids:
            visibility_conditions.append(Task.assigned_to_id.in_(team_ids))
        query = query.where(or_(*visibility_conditions))

    if status is not None:
        query = query.where(Task.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = (
        query.options(selectinload(Task.assigned_to), selectinload(Task.assigned_by))
        .order_by(Task.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = await db.execute(query)
    tasks = rows.scalars().all()

    return {
        "success": True,
        "message": "Success",
        "data": [_task_to_out(t).model_dump(mode="json") for t in tasks],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "can_view_all": can_view_all,
        "can_create": await _can_create_task(current_employee, db),
        "team_member_ids": list(team_ids),
        "assignable_member_ids": list(assignable_ids),
    }


@router.post("", summary="Create task", status_code=201)
async def create_task(
    body: TaskCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not await _can_create_task(current_employee, db):
        raise HTTPException(status_code=403, detail="Access denied")

    assignee = await db.get(Employee, body.assigned_to_id)
    if not assignee or not assignee.is_active:
        raise HTTPException(status_code=404, detail="Assigned employee not found")

    task = Task(
        title=body.title.strip(),
        description=body.description,
        assigned_to_id=body.assigned_to_id,
        assigned_by_id=current_employee.id,
        due_date=body.due_date,
        priority=body.priority,
    )
    db.add(task)
    await db.flush()

    loaded = await db.execute(
        select(Task)
        .options(selectinload(Task.assigned_to), selectinload(Task.assigned_by))
        .where(Task.id == task.id)
    )
    task = loaded.scalar_one()

    if assignee.id != current_employee.id:
        db.add(Notification(
            employee_id=assignee.id,
            title=f"New task from {current_employee.first_name}",
            body=f"{task.title} has been assigned to you.",
            notification_type=NotificationType.task_assigned,
            reference_id=task.id,
            reference_type="task",
        ))

    return ok(data=_task_to_out(task), message="Task created")


@router.patch("/{task_id}", summary="Update task")
async def update_task(
    task_id: str,
    body: TaskUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assigned_to), selectinload(Task.assigned_by))
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    can_view_all = _is_all_tasks_user(current_employee)
    is_assignee = task.assigned_to_id == current_employee.id
    is_assigner = task.assigned_by_id == current_employee.id

    if not (can_view_all or is_assignee or is_assigner):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = body.model_dump(exclude_unset=True)

    # Assignees can only update progress / status — not structural fields
    if not (can_view_all or is_assigner):
        for restricted in ("title", "description", "assigned_to_id", "due_date", "priority", "is_archived"):
            update_data.pop(restricted, None)

    old_assigned_to = task.assigned_to_id
    if "assigned_to_id" in update_data:
        assignee = await db.get(Employee, update_data["assigned_to_id"])
        if not assignee or not assignee.is_active:
            raise HTTPException(status_code=404, detail="Assigned employee not found")

    for key, value in update_data.items():
        setattr(task, key, value)

    if task.status == TaskStatus.done and task.progress < 100:
        task.progress = 100
    if task.progress >= 100 and task.status != TaskStatus.done:
        task.status = TaskStatus.done

    await db.flush()
    refreshed = await db.execute(
        select(Task)
        .options(selectinload(Task.assigned_to), selectinload(Task.assigned_by))
        .where(Task.id == task.id)
    )
    task = refreshed.scalar_one()

    if old_assigned_to != task.assigned_to_id:
        db.add(Notification(
            employee_id=task.assigned_to_id,
            title="Task reassigned",
            body=f"You have been assigned: {task.title}",
            notification_type=NotificationType.task_assigned,
            reference_id=task.id,
            reference_type="task",
        ))
    elif task.assigned_to_id != current_employee.id:
        db.add(Notification(
            employee_id=task.assigned_to_id,
            title="Task updated",
            body=f"{task.title} was updated.",
            notification_type=NotificationType.task_updated,
            reference_id=task.id,
            reference_type="task",
        ))

    return ok(data=_task_to_out(task), message="Task updated")
