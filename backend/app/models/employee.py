from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Date, DateTime, Text, ForeignKey,
    Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
from app.utils.encryption import EncryptedString
import enum


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class MaritalStatus(str, enum.Enum):
    single = "single"
    married = "married"
    divorced = "divorced"
    widowed = "widowed"


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    intern = "intern"


class EmploymentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    on_leave = "on_leave"
    terminated = "terminated"
    resigned = "resigned"


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    hr_admin = "hr_admin"
    manager = "manager"
    employee = "employee"


# ─────────────────────────────────────────────────────────────────────────────
# Department
# ─────────────────────────────────────────────────────────────────────────────
class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    head_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id", use_alter=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")
    head: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[head_id])


# ─────────────────────────────────────────────────────────────────────────────
# Designation
# ─────────────────────────────────────────────────────────────────────────────
class Designation(Base, TimestampMixin):
    __tablename__ = "designations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    level: Mapped[Optional[int]] = mapped_column(nullable=True)
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="designation")


# ─────────────────────────────────────────────────────────────────────────────
# Employee
# ─────────────────────────────────────────────────────────────────────────────
class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    emp_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Name
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Auth
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # work email
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.employee)

    # Personal
    personal_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[Gender]] = mapped_column(SAEnum(Gender), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    marital_status: Mapped[Optional[MaritalStatus]] = mapped_column(SAEnum(MaritalStatus), nullable=True)
    spouse_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    spouse_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Family / Emergency
    father_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    father_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    father_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mother_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    mother_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    mother_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_relation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Address
    permanent_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permanent_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    permanent_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    permanent_pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    current_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(100), default="Indian")

    # Compliance / Finance
    pan_number: Mapped[Optional[str]] = mapped_column(EncryptedString(255), nullable=True)
    aadhaar_number: Mapped[Optional[str]] = mapped_column(EncryptedString(255), nullable=True)
    uan_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    esic_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Org
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    designation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("designations.id"), nullable=True)
    reporting_manager_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    employment_type: Mapped[Optional[EmploymentType]] = mapped_column(SAEnum(EmploymentType), nullable=True)
    employment_status: Mapped[EmploymentStatus] = mapped_column(SAEnum(EmploymentStatus), default=EmploymentStatus.active)
    date_of_joining: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_of_exit: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    probation_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    work_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    grade_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Salary
    salary_level_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("salary_levels.id"), nullable=True)

    # Profile
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    face_embedding: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    # Mobile — FCM device token for push notifications
    fcm_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Geofence / Work Location
    # NULL  → employee uses the global fallback (all active zones checked)
    # Set   → employee is validated only against this specific zone
    # skip_location_check=True → WFH / travelling employee, no GPS check at all
    geofence_zone_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("geofence_zones.id"), nullable=True)
    skip_location_check: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    designation: Mapped[Optional["Designation"]] = relationship("Designation", back_populates="employees")
    reporting_manager: Mapped[Optional["Employee"]] = relationship("Employee", remote_side="Employee.id", foreign_keys=[reporting_manager_id])
    salary_level: Mapped[Optional["SalaryLevel"]] = relationship("SalaryLevel", back_populates="employees")
    geofence_zone: Mapped[Optional["GeofenceZone"]] = relationship("GeofenceZone", foreign_keys="Employee.geofence_zone_id")
    device_tokens: Mapped[List["DeviceToken"]] = relationship("DeviceToken", back_populates="employee")
    leave_balances: Mapped[List["LeaveBalance"]] = relationship("LeaveBalance", back_populates="employee")
    leave_requests: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="employee", foreign_keys="LeaveRequest.employee_id")
    attendance_logs: Mapped[List["AttendanceLog"]] = relationship("AttendanceLog", back_populates="employee", foreign_keys="AttendanceLog.employee_id")
    profile: Mapped[Optional["EmployeeProfile"]] = relationship("EmployeeProfile", back_populates="employee", uselist=False)

    @property
    def full_name(self) -> str:
        first = (self.first_name or "").strip()
        middle = (self.middle_name or "").strip()
        last = (self.last_name or "").strip()

        # HR display rule: show Monika without "Bindroo" suffix.
        if first.lower() in {"monika", "monica"} and last.lower() == "bindroo":
            parts = [first, middle]
            return " ".join(p for p in parts if p)

        parts = [first, middle, last]
        return " ".join(p for p in parts if p)


# ─────────────────────────────────────────────────────────────────────────────
# Device Token (Mobile push notifications)
# ─────────────────────────────────────────────────────────────────────────────
class DeviceToken(Base, TimestampMixin):
    __tablename__ = "device_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # android / ios / web
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="device_tokens")
