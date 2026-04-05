import { api } from './client'
import type { APIResponse, PaginatedResponse, Employee, EmployeeDetail, Department, Designation } from '@/types'

export const employeesApi = {
  list: (params?: { page?: number; per_page?: number; department_id?: string; search?: string; status?: string }) =>
    api.get<PaginatedResponse<Employee>>('/employees', { params }),

  orgChart: () => api.get<APIResponse<Employee[]>>('/employees/org-chart'),

  get: (id: string) => api.get<APIResponse<EmployeeDetail>>(`/employees/${id}`),

  me: () => api.get<APIResponse<EmployeeDetail>>('/employees/me'),

  create: (data: Record<string, unknown>) =>
    api.post<APIResponse<EmployeeDetail>>('/employees', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<APIResponse<EmployeeDetail>>(`/employees/${id}`, data),

  deactivate: (id: string) => api.delete<APIResponse<null>>(`/employees/${id}`),

  departments: () => api.get<APIResponse<Department[]>>('/employees/departments/all'),

  designations: () => api.get<APIResponse<Designation[]>>('/employees/designations/all'),

  birthdaysToday: () => api.get<APIResponse<{ id: string; full_name: string; emp_code: string; age: number | null; avatar_url: string | null }[]>>('/employees/birthdays/today'),
}
