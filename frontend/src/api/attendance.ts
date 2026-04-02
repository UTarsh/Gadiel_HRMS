import { api } from './client'
import type { APIResponse, PaginatedResponse, AttendanceLog, AttendanceSummary, GeofenceZone, GeofenceEmployee } from '@/types'

export const attendanceApi = {
  today: () => api.get<APIResponse<AttendanceLog | null>>('/attendance/today'),

  todayAll: () =>
    api.get<APIResponse<{ id: string; emp_code: string; full_name: string; role: string; status: string; punch_in: string | null; punch_out: string | null }[]>>('/attendance/today-all'),

  todayForEmployee: (employeeId: string) =>
    api.get<APIResponse<AttendanceLog | null>>(`/attendance/today/${employeeId}`),

  my: (params?: { month?: number; year?: number; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<AttendanceLog>>('/attendance/my', { params }),

  summary: (employeeId: string, month: number, year: number) =>
    api.get<APIResponse<AttendanceSummary>>(`/attendance/summary/${employeeId}`, {
      params: { month, year },
    }),

  punchIn: (latitude: number, longitude: number, is_wfh?: boolean) =>
    api.post<APIResponse<AttendanceLog>>('/attendance/punch-in', { latitude, longitude, is_wfh }),

  punchOut: (latitude: number, longitude: number) =>
    api.post<APIResponse<AttendanceLog>>('/attendance/punch-out', { latitude, longitude }),

  correct: (logId: string, data: Record<string, unknown>) =>
    api.patch<APIResponse<AttendanceLog>>(`/attendance/logs/${logId}/correct`, data),

  listZones: () =>
    api.get<APIResponse<(GeofenceZone & { employee_count: number })[]>>('/attendance/geofence-zones'),

  listGeofenceEmployees: () =>
    api.get<APIResponse<GeofenceEmployee[]>>('/attendance/geofence-employees'),

  createZone: (data: { name: string; latitude: number; longitude: number; radius_meters: number; employee_ids?: string[] }) =>
    api.post<APIResponse<GeofenceZone>>('/attendance/geofence-zones', data),

  updateZone: (id: string, data: Partial<{ name: string; latitude: number; longitude: number; radius_meters: number; is_active: boolean; employee_ids: string[] }>) =>
    api.patch<APIResponse<GeofenceZone>>(`/attendance/geofence-zones/${id}`, data),

  deleteZone: (id: string) =>
    api.delete<APIResponse<null>>(`/attendance/geofence-zones/${id}`),
}
