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


class PayrollStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    approved = "approved"
    paid = "paid"
    cancelled = "cancelled"


class PayslipStatus(str, enum.Enum):
    draft = "draft"
    finalized = "finalized"
    paid = "paid"


# ─────────────────────────────────────────────────────────────────────────────
# Payroll Run (one per month, covers all employees)
# ─────────────────────────────────────────────────────────────────────────────
class PayrollRun(Base, TimestampMixin):
    __tablename__ = "payroll_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    month: Mapped[int] = mapped_column(Integer, nullable=False)   # 1-12
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[PayrollStatus] = mapped_column(SAEnum(PayrollStatus), default=PayrollStatus.draft)

    # Summary totals (populated after processing)
    total_employees: Mapped[int] = mapped_column(Integer, default=0)
    total_gross: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total_net: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    # Audit trail
    processed_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    processed_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[processed_by_id])  # type: ignore[name-defined]
    approved_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[approved_by_id])  # type: ignore[name-defined]
    payslips: Mapped[List["Payslip"]] = relationship("Payslip", back_populates="payroll_run")


# ─────────────────────────────────────────────────────────────────────────────
# Payslip (per employee, per payroll run)
# ─────────────────────────────────────────────────────────────────────────────
class Payslip(Base, TimestampMixin):
    __tablename__ = "payslips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    payroll_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("payroll_runs.id"), nullable=False)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)

    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Attendance summary for the month
    working_days_in_month: Mapped[int] = mapped_column(Integer, default=0)
    days_worked: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)   # includes half-days
    days_absent: Mapped[int] = mapped_column(Integer, default=0)
    days_on_leave: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    days_lwp: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)      # Leave Without Pay

    # Earnings (snapshot at time of payroll — salary can change)
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    transport_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    special_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    medical_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_allowances: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    lwp_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)  # (days_lwp / working_days) * gross
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Deductions
    pf_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    pf_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    professional_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tds: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    status: Mapped[PayslipStatus] = mapped_column(SAEnum(PayslipStatus), default=PayslipStatus.draft)
    paid_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Generated PDF link (stored in cloud or local)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    payroll_run: Mapped["PayrollRun"] = relationship("PayrollRun", back_populates="payslips")
    employee: Mapped["Employee"] = relationship("Employee")  # type: ignore[name-defined]
