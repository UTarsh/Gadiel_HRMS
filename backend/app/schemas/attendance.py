from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from app.models.attendance import AttendanceStatus


class PunchInRequest(BaseModel):
    """Mobile app sends this when employee punches in."""
    latitude: float
    longitude: float
    selfie_base64: Optional[str] = None  # base64 encoded image
    is_wfh: bool = False  # employee declares WFH for today — bypasses geofence


class PunchOutRequest(BaseModel):
    """Mobile app sends this when employee punches out."""
    latitude: float
    longitude: float
    selfie_base64: Optional[str] = None


class AttendanceLogOut(BaseModel):
    id: str
    employee_id: str
    date: date
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    working_minutes: Optional[int] = None
    overtime_minutes: int
    late_minutes: int
    status: AttendanceStatus
    punch_in_location_valid: Optional[bool] = None
    punch_out_location_valid: Optional[bool] = None
    punch_in_face_score: Optional[Decimal] = None
    remarks: Optional[str] = None
    is_manual_correction: bool

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    """Used in mobile dashboard card."""
    employee_id: str
    month: int
    year: int
    total_working_days: int
    present: int
    absent: int
    late: int
    half_day: int
    wfh: int
    on_leave: int
    total_overtime_minutes: int
    attendance_percentage: float


class ManualCorrectionRequest(BaseModel):
    """HR-only: manually correct an attendance record."""
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    remarks: Optional[str] = None


# ── Geofence Zone schemas ─────────────────────────────────────────────────────

class GeofenceZoneCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_meters: int = 200
    employee_ids: list[str] = Field(default_factory=list)


class GeofenceZoneUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = None
    is_active: Optional[bool] = None
    employee_ids: Optional[list[str]] = None


class GeofenceZoneOut(BaseModel):
    id: str
    name: str
    latitude: Decimal
    longitude: Decimal
    radius_meters: int
    is_active: bool

    model_config = {"from_attributes": True}


class GeofenceEmployeeOut(BaseModel):
    id: str
    emp_code: str
    full_name: str
    geofence_zone_id: Optional[str] = None
    skip_location_check: bool = False
