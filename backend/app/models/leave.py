from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Date, DateTime, Text, ForeignKey,
    Numeric, Integer, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
import enum


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    auto_approved = "auto_approved"


class GenderApplicable(str, enum.Enum):
    all = "all"
    female = "female"
    male = "male"


# ─────────────────────────────────────────────────────────────────────────────
# Leave Type  (EL, SL, CL, Maternity, Paternity, Bereavement, LWP)
# ─────────────────────────────────────────────────────────────────────────────
class LeaveType(Base, TimestampMixin):
    __tablename__ = "leave_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)  # EL, SL, CL, ML, PL, BL, LWP
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Entitlement rules (from Gadiel Leave Policy)
    entitlement_days_annual: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # e.g. 12 for EL
    accrual_per_month: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 2), nullable=True)  # 1.0 for EL
    max_carryforward_days: Mapped[int] = mapped_column(Integer, default=0)
    max_consecutive_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_notice_days: Mapped[int] = mapped_column(Integer, default=1)
    document_required_after_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # e.g. 2 for SL

    # Eligibility
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    gender_applicable: Mapped[GenderApplicable] = mapped_column(SAEnum(GenderApplicable), default=GenderApplicable.all)
    min_service_months: Mapped[int] = mapped_column(Integer, default=0)  # e.g. EL needs 3-6 months
    requires_probation_completion: Mapped[bool] = mapped_column(Boolean, default=False)

    # Auto-approve threshold (days <= this get auto-approved if balance available)
    auto_approve_max_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    balances: Mapped[List["LeaveBalance"]] = relationship("LeaveBalance", back_populates="leave_type")
    requests: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="leave_type")


# ─────────────────────────────────────────────────────────────────────────────
# Leave Balance (per employee, per leave type, per year)
# ─────────────────────────────────────────────────────────────────────────────
class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 2025

    total_entitled: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)
    carried_forward: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)
    accrued: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)
    used: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)
    pending: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)  # approved but not consumed yet
    adjusted: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0)  # manual HR adjustments

    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def available(self) -> Decimal:
        return self.total_entitled + self.carried_forward + self.accrued + self.adjusted - self.used - self.pending

    employee: Mapped["Employee"] = relationship("Employee", back_populates="leave_balances")
    leave_type: Mapped["LeaveType"] = relationship("LeaveType", back_populates="balances")


# ─────────────────────────────────────────────────────────────────────────────
# Leave Request
# ─────────────────────────────────────────────────────────────────────────────
class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"), nullable=False)

    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    is_half_day: Mapped[bool] = mapped_column(Boolean, default=False)
    half_day_session: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # morning / afternoon

    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    status: Mapped[LeaveStatus] = mapped_column(SAEnum(LeaveStatus), default=LeaveStatus.pending)
    approved_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI decision trace (stored as JSON string)
    ai_decision_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])
    leave_type: Mapped["LeaveType"] = relationship("LeaveType", back_populates="requests")
    approved_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[approved_by_id])


# ─────────────────────────────────────────────────────────────────────────────
# Public Holiday Calendar
# ─────────────────────────────────────────────────────────────────────────────
class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    holiday_type: Mapped[str] = mapped_column(String(30), default="national")  # national / regional / optional
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
