from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
import enum


class NotificationType(str, enum.Enum):
    leave_applied = "leave_applied"
    leave_approved = "leave_approved"
    leave_rejected = "leave_rejected"
    attendance_marked = "attendance_marked"
    attendance_missing = "attendance_missing"
    task_assigned = "task_assigned"
    task_updated = "task_updated"
    announcement = "announcement"
    birthday = "birthday"
    work_anniversary = "work_anniversary"
    system = "system"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)

    # Reference to source entity
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # leave / attendance / task

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Push delivery status
    push_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    push_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee")
