// ─── Auth ───────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface APIResponse<T = null> {
  success: boolean
  message: string
  data: T | null
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'hr_admin' | 'manager' | 'employee'
export type Gender = 'male' | 'female' | 'other'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'
export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'resigned'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'auto_approved'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'wfh' | 'on_leave' | 'holiday' | 'week_off'
export type NotificationType = 'leave_applied' | 'leave_approved' | 'leave_rejected' | 'attendance_marked' | 'attendance_missing' | 'announcement' | 'system'

// ─── Employee ────────────────────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  code: string | null
}

export interface Designation {
  id: string
  name: string
  level: number | null
}

export interface Employee {
  id: string
  emp_code: string
  first_name: string
  middle_name: string | null
  last_name: string
  full_name: string
  email: string
  personal_email: string | null
  phone: string | null
  gender: Gender | null
  date_of_birth: string | null
  blood_group: string | null
  marital_status: MaritalStatus | null
  employment_type: EmploymentType | null
  employment_status: EmploymentStatus
  date_of_joining: string | null
  role: UserRole
  profile_picture_url: string | null
  ghibli_image_url?: string | null
  work_location: string | null
  grade_level: string | null
  department: Department | null
  designation: Designation | null
  is_active: boolean
  reporting_manager_id: string | null
  geofence_zone_id?: string | null
  skip_location_check?: boolean
}

export interface EmployeeDetail extends Employee {
  alternate_phone: string | null
  spouse_name: string | null
  father_name: string | null
  mother_name: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  permanent_address: string | null
  permanent_city: string | null
  permanent_state: string | null
  pan_number: string | null
  aadhaar_number: string | null
  uan_number: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_name: string | null
  probation_end_date: string | null
  date_of_exit: string | null
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export interface LeaveType {
  id: string
  name: string
  code: string
  entitlement_days_annual: number | null
  max_carryforward_days: number
  min_notice_days: number
  is_paid: boolean
  auto_approve_max_days: number | null
}

export interface LeaveBalance {
  id: string
  leave_type_id: string
  leave_type: LeaveType
  year: number
  total_entitled: number
  carried_forward: number
  accrued: number
  used: number
  pending: number
  available: number
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  from_date: string
  to_date: string
  days: number
  is_half_day: boolean
  reason: string | null
  status: LeaveStatus
  approved_by_id: string | null
  approved_at: string | null
  rejection_reason: string | null
  document_url: string | null
  created_at: string
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  punch_in: string | null
  punch_out: string | null
  working_minutes: number | null
  overtime_minutes: number
  late_minutes: number
  status: AttendanceStatus
  punch_in_location_valid: boolean | null
  punch_out_location_valid: boolean | null
  punch_in_face_score: number | null
  remarks: string | null
  is_manual_correction: boolean
}

export interface AttendanceSummary {
  employee_id: string
  month: number
  year: number
  total_working_days: number
  present: number
  absent: number
  late: number
  half_day: number
  wfh: number
  on_leave: number
  total_overtime_minutes: number
  attendance_percentage: number
}

// ─── Geofence ─────────────────────────────────────────────────────────────────

export interface GeofenceZone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

export interface GeofenceEmployee {
  id: string
  emp_code: string
  full_name: string
  geofence_zone_id: string | null
  skip_location_check: boolean
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  body: string
  type: NotificationType
  reference_id: string | null
  reference_type: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
}

// Salary / Payroll
export interface SalaryOverview {
  month: number
  year: number
  salary_available: boolean
  salary: {
    gross_salary: number
    net_salary: number
    total_deductions: number
    basic_salary: number
    hra: number
    special_allowance: number
    ctc_monthly: number
    ctc_annual: number
    progress_percent: number
  } | null
  tracker: {
    planned_budget: number
    spent_amount: number
    remaining_budget: number
    notes: string | null
    income_total: number
    expense_total: number
    records_count: number
  }
  latest_payslip: Payslip | null
  can_generate_payslips: boolean
}

export interface SalaryTrackerRecord {
  id: string
  month: number
  year: number
  record_date: string
  title: string
  amount: number
  record_type: 'expense' | 'income' | 'savings'
  notes: string | null
  created_at: string
}

export interface Payslip {
  id: string
  employee_id: string
  employee_name: string
  month: number
  year: number
  status: 'draft' | 'finalized' | 'paid'
  gross_salary: number
  total_deductions: number
  net_salary: number
  days_worked: number
  days_absent: number
  days_on_leave: number
  days_lwp: number
  pdf_url: string | null
  created_at: string
}

// Reports
export interface MonthlyReport {
  month: number
  year: number
  attendance: {
    total_logs: number
    by_status: Record<string, number>
  }
  leaves: {
    total_requests: number
    by_status: Record<string, number>
    approved_days: number
  }
  payroll: {
    generated_payslips: number
    total_gross: number
    total_deductions: number
    total_net: number
  }
  employee_snapshot: Array<{
    employee_id: string
    employee_name: string
    role: UserRole | null
    days_worked: number
    approved_leave_days: number
    net_salary: number
    today_status: string
  }>
}
