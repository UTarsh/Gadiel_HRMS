from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date
from app.models.employee import Gender, MaritalStatus, EmploymentType, EmploymentStatus, UserRole


class DepartmentOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None

    model_config = {"from_attributes": True}


class DesignationOut(BaseModel):
    id: str
    name: str
    level: Optional[int] = None

    model_config = {"from_attributes": True}


class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(None, pattern=r"^(A|B|AB|O)[+-]$")
    marital_status: Optional[MaritalStatus] = None


class EmployeeCreate(EmployeeBase):
    emp_code: str
    password: str
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    employment_type: Optional[EmploymentType] = EmploymentType.full_time
    date_of_joining: Optional[date] = None
    role: UserRole = UserRole.employee
    salary_level_id: Optional[str] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[MaritalStatus] = None
    spouse_name: Optional[str] = None
    spouse_phone: Optional[str] = None
    father_name: Optional[str] = None
    father_phone: Optional[str] = None
    mother_name: Optional[str] = None
    mother_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_state: Optional[str] = None
    permanent_pincode: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    current_pincode: Optional[str] = None
    pan_number: Optional[str] = Field(None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
    aadhaar_number: Optional[str] = Field(None, pattern=r"^[0-9]{12}$")
    uan_number: Optional[str] = Field(None, pattern=r"^[0-9]{12}$")
    bank_account_number: Optional[str] = Field(None, min_length=9, max_length=18)
    bank_ifsc: Optional[str] = Field(None, pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")
    bank_name: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    employment_status: Optional[EmploymentStatus] = None
    salary_level_id: Optional[str] = None
    work_location: Optional[str] = None
    grade_level: Optional[str] = None
    geofence_zone_id: Optional[str] = None
    skip_location_check: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: str
    emp_code: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    full_name: str
    email: str
    personal_email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[MaritalStatus] = None
    employment_type: Optional[EmploymentType] = None
    employment_status: EmploymentStatus
    date_of_joining: Optional[date] = None
    role: UserRole
    profile_picture_url: Optional[str] = None
    work_location: Optional[str] = None
    grade_level: Optional[str] = None
    department: Optional[DepartmentOut] = None
    designation: Optional[DesignationOut] = None
    reporting_manager_id: Optional[str] = None
    geofence_zone_id: Optional[str] = None
    skip_location_check: bool = False
    is_active: bool

    model_config = {"from_attributes": True}


class EmployeeDetailOut(EmployeeOut):
    """Full profile - used by HR admin and self-view."""
    alternate_phone: Optional[str] = None
    spouse_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_state: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    uan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    probation_end_date: Optional[date] = None
    date_of_exit: Optional[date] = None

    model_config = {"from_attributes": True}
