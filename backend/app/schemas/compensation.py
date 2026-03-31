from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.payroll import PayslipStatus


class SalaryTrackerUpdateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    planned_budget: Optional[Decimal] = Field(default=None, ge=0)
    spent_amount: Optional[Decimal] = Field(default=None, ge=0)
    notes: Optional[str] = None


class PayslipGenerateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)


class PayslipOut(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    month: int
    year: int
    status: PayslipStatus
    gross_salary: Decimal
    total_deductions: Decimal
    net_salary: Decimal
    days_worked: Decimal
    days_absent: int
    days_on_leave: Decimal
    days_lwp: Decimal
    pdf_url: Optional[str] = None
    created_at: datetime


class SalaryTrackerRecordCreateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    record_date: date
    title: str = Field(..., min_length=2, max_length=220)
    amount: Decimal = Field(..., gt=0)
    record_type: str = Field(..., pattern="^(expense|income|savings)$")
    notes: Optional[str] = None
