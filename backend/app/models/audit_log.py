from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, DateTime, Text, ForeignKey, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import gen_uuid
import enum


class AuditAction(str, enum.Enum):
    created = "created"
    updated = "updated"
    deleted = "deleted"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    login = "login"
    logout = "logout"
    password_changed = "password_changed"
    role_changed = "role_changed"
    document_uploaded = "document_uploaded"
    payroll_processed = "payroll_processed"
    payroll_approved = "payroll_approved"


# ─────────────────────────────────────────────────────────────────────────────
# AuditLog — immutable event trail for HR compliance
# No updated_at (intentionally immutable). created_at only.
# ─────────────────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)

    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction), nullable=False)

    # What entity was affected
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. "employee", "leave_request"
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Who did it
    performed_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    # Request metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)   # IPv4 or IPv6
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Diff (stored as JSON strings — keep lightweight)
    old_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON
    new_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    performed_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[performed_by_id])  # type: ignore[name-defined]
