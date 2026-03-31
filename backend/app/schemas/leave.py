from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from app.models.leave import LeaveStatus


class LeaveTypeOut(BaseModel):
    id: str
    name: str
    code: str
    entitlement_days_annual: Optional[int] = None
    max_carryforward_days: int
    min_notice_days: int
    is_paid: bool
    auto_approve_max_days: Optional[int] = None

    model_config = {"from_attributes": True}


class LeaveBalanceOut(BaseModel):
    id: str
    leave_type_id: str
    leave_type: LeaveTypeOut
    year: int
    total_entitled: Decimal
    carried_forward: Decimal
    accrued: Decimal
    used: Decimal
    pending: Decimal
    available: Decimal

    model_config = {"from_attributes": True}


class LeaveApplyRequest(BaseModel):
    leave_type_id: str
    from_date: date
    to_date: date
    is_half_day: bool = False
    half_day_session: Optional[str] = None  # morning / afternoon
    reason: Optional[str] = None

    @field_validator("to_date")
    @classmethod
    def to_date_must_be_gte_from_date(cls, v, info):
        if "from_date" in info.data and v < info.data["from_date"]:
            raise ValueError("to_date must be >= from_date")
        return v


class LeaveActionRequest(BaseModel):
    action: str  # approve / reject
    rejection_reason: Optional[str] = None


class LeaveRequestOut(BaseModel):
    id: str
    employee_id: str
    leave_type: LeaveTypeOut
    from_date: date
    to_date: date
    days: Decimal
    is_half_day: bool
    reason: Optional[str] = None
    status: LeaveStatus
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    document_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
