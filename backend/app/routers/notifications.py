from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone

from app.database import get_db
from app.models.notification import Notification
from app.models.employee import Employee
from app.schemas.common import ok
from app.middleware.auth import get_current_employee

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="Get my notifications (mobile notification bell)")
async def my_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.employee_id == current_employee.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    notifications = result.scalars().all()

    # Unread count
    unread_result = await db.execute(
        select(Notification).where(
            Notification.employee_id == current_employee.id,
            Notification.is_read == False,
        )
    )
    unread_count = len(unread_result.scalars().all())

    return ok(data={
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "type": n.notification_type.value,
                "reference_id": n.reference_id,
                "reference_type": n.reference_type,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
        "unread_count": unread_count,
    })


@router.patch("/{notification_id}/read", summary="Mark notification as read")
async def mark_read(
    notification_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.employee_id == current_employee.id)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    return ok(message="Marked as read")


@router.patch("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.employee_id == current_employee.id, Notification.is_read == False)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    return ok(message="All notifications marked as read")
