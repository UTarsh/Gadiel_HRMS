import { api } from './client'
import type { APIResponse, PaginatedResponse, LeaveType, LeaveBalance, LeaveRequest } from '@/types'

export const leavesApi = {
  types: () => api.get<APIResponse<LeaveType[]>>('/leaves/types'),

  myBalance: (year?: number) =>
    api.get<APIResponse<LeaveBalance[]>>('/leaves/balance', { params: { year } }),

  employeeBalance: (employeeId: string, year?: number) =>
    api.get<APIResponse<LeaveBalance[]>>(`/leaves/balance/${employeeId}`, { params: { year } }),

  apply: (data: {
    leave_type_id: string
    from_date: string
    to_date: string
    is_half_day?: boolean
    half_day_session?: string
    reason?: string
  }) => api.post<APIResponse<LeaveRequest>>('/leaves/apply', data),

  myLeaves: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<LeaveRequest>>('/leaves/my', { params }),

  teamLeaves: (params?: { status?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<LeaveRequest>>('/leaves/team', { params }),

  action: (leaveId: string, action: 'approve' | 'reject', rejection_reason?: string) =>
    api.patch<APIResponse<LeaveRequest>>(`/leaves/${leaveId}/action`, { action, rejection_reason }),

  cancel: (leaveId: string) =>
    api.patch<APIResponse<null>>(`/leaves/${leaveId}/cancel`),
}
