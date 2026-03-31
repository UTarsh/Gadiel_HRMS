from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Date, DateTime, Time, Text,
    ForeignKey, Numeric, Integer, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
import enum


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    wfh = "wfh"
    on_leave = "on_leave"
    holiday = "holiday"
    week_off = "week_off"


# ─────────────────────────────────────────────────────────────────────────────
# Shift Definition
# ─────────────────────────────────────────────────────────────────────────────
class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=15)
    min_hours_for_half_day: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=4.0)
    min_hours_for_full_day: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=8.0)
    is_night_shift: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    assignments: Mapped[List["ShiftAssignment"]] = relationship("ShiftAssignment", back_populates="shift")
    attendance_logs: Mapped[List["AttendanceLog"]] = relationship("AttendanceLog", back_populates="shift")


# ─────────────────────────────────────────────────────────────────────────────
# Shift Assignment (employee → shift, with effective date range)
# ─────────────────────────────────────────────────────────────────────────────
class ShiftAssignment(Base, TimestampMixin):
    __tablename__ = "shift_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee")
    shift: Mapped["Shift"] = relationship("Shift", back_populates="assignments")


# ─────────────────────────────────────────────────────────────────────────────
# Attendance Log (daily punch record)
# ─────────────────────────────────────────────────────────────────────────────
class AttendanceLog(Base, TimestampMixin):
    __tablename__ = "attendance_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # Punch In
    punch_in: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    punch_in_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    punch_in_lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    punch_in_selfie_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    punch_in_face_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    punch_in_location_valid: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Punch Out
    punch_out: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    punch_out_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    punch_out_lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    punch_out_selfie_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    punch_out_face_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    punch_out_location_valid: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Computed
    working_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    overtime_minutes: Mapped[int] = mapped_column(Integer, default=0)
    late_minutes: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus), default=AttendanceStatus.absent)
    shift_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Manual correction audit
    is_manual_correction: Mapped[bool] = mapped_column(Boolean, default=False)
    corrected_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    corrected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendance_logs", foreign_keys=[employee_id])
    shift: Mapped[Optional["Shift"]] = relationship("Shift", back_populates="attendance_logs")
    corrected_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[corrected_by_id])


# ─────────────────────────────────────────────────────────────────────────────
# Geofence Zone (office/site boundaries for GPS validation)
# ─────────────────────────────────────────────────────────────────────────────
class GeofenceZone(Base, TimestampMixin):
    __tablename__ = "geofence_zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    radius_meters: Mapped[int] = mapped_column(Integer, default=200)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
