from app.schemas.common import APIResponse, PaginatedResponse, ok, fail
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, TokenPayload, RegisterDeviceTokenRequest
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeDetailOut, DepartmentOut, DesignationOut
from app.schemas.leave import LeaveApplyRequest, LeaveActionRequest, LeaveRequestOut, LeaveBalanceOut, LeaveTypeOut
from app.schemas.attendance import PunchInRequest, PunchOutRequest, AttendanceLogOut, AttendanceSummary, ManualCorrectionRequest
