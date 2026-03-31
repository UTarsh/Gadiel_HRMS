# Import all models here so Alembic can detect them for migrations

from app.models.employee import Employee, Department, Designation, DeviceToken, Gender, MaritalStatus, EmploymentType, EmploymentStatus, UserRole
from app.models.employee_profile import EmployeeProfile
from app.models.salary import SalaryLevel, SalaryComponent
from app.models.leave import LeaveType, LeaveBalance, LeaveRequest, Holiday, LeaveStatus, GenderApplicable
from app.models.attendance import AttendanceLog, Shift, ShiftAssignment, GeofenceZone, AttendanceStatus
from app.models.notification import Notification, NotificationType
from app.models.payroll import PayrollRun, Payslip, PayrollStatus, PayslipStatus
from app.models.document import Document, DocumentType
from app.models.audit_log import AuditLog, AuditAction
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.salary_tracker import SalaryTracker, SalaryTrackerRecord, SalaryRecordType

__all__ = [
    "Employee", "Department", "Designation", "DeviceToken", "EmployeeProfile",
    "Gender", "MaritalStatus", "EmploymentType", "EmploymentStatus", "UserRole",
    "SalaryLevel", "SalaryComponent",
    "LeaveType", "LeaveBalance", "LeaveRequest", "Holiday",
    "LeaveStatus", "GenderApplicable",
    "AttendanceLog", "Shift", "ShiftAssignment", "GeofenceZone", "AttendanceStatus",
    "Notification", "NotificationType",
    "PayrollRun", "Payslip", "PayrollStatus", "PayslipStatus",
    "Document", "DocumentType",
    "AuditLog", "AuditAction",
    "Task", "TaskStatus", "TaskPriority",
    "SalaryTracker", "SalaryTrackerRecord", "SalaryRecordType",
]
