from typing import Optional, List
from decimal import Decimal
from sqlalchemy import String, Boolean, Numeric, Text, ForeignKey, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
from datetime import date


# ─────────────────────────────────────────────────────────────────────────────
# Salary Level (6-band structure from Gadiel)
# ─────────────────────────────────────────────────────────────────────────────
class SalaryLevel(Base, TimestampMixin):
    __tablename__ = "salary_levels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    level: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)  # 1-6
    label: Mapped[str] = mapped_column(String(50), nullable=False)            # e.g. "L1", "L2"
    min_experience_years: Mapped[int] = mapped_column(Integer, nullable=False)
    max_experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # null = no upper bound
    min_ctc_annual: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    max_ctc_annual: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="salary_level")
    salary_components: Mapped[List["SalaryComponent"]] = relationship("SalaryComponent", back_populates="salary_level")


# ─────────────────────────────────────────────────────────────────────────────
# Salary Component (per-employee breakdown: Basic, HRA, TA, etc.)
# ─────────────────────────────────────────────────────────────────────────────
class SalaryComponent(Base, TimestampMixin):
    __tablename__ = "salary_components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    salary_level_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("salary_levels.id"), nullable=True)

    # Earnings
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    transport_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    special_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    medical_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Deductions
    pf_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    pf_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    professional_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tds: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee")
    salary_level: Mapped[Optional["SalaryLevel"]] = relationship("SalaryLevel", back_populates="salary_components")
