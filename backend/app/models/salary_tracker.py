from decimal import Decimal
from typing import Optional
from datetime import date
import enum

from sqlalchemy import String, Numeric, Integer, Text, ForeignKey, UniqueConstraint, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, gen_uuid


class SalaryTracker(Base, TimestampMixin):
    __tablename__ = "salary_trackers"
    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="uq_salary_tracker_emp_month_year"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee")  # type: ignore[name-defined]


class SalaryRecordType(str, enum.Enum):
    expense = "expense"
    income = "income"
    savings = "savings"


class SalaryTrackerRecord(Base, TimestampMixin):
    __tablename__ = "salary_tracker_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    record_type: Mapped[SalaryRecordType] = mapped_column(SAEnum(SalaryRecordType), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee")  # type: ignore[name-defined]
