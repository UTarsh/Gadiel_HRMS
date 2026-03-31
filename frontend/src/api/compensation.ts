import { api } from './client'
import type { APIResponse, PaginatedResponse, Payslip, SalaryOverview, SalaryTrackerRecord } from '@/types'

export const compensationApi = {
  overview: (params?: { month?: number; year?: number }) =>
    api.get<APIResponse<SalaryOverview>>('/compensation/overview', { params }),

  updateTracker: (data: {
    month: number
    year: number
    planned_budget?: number
    spent_amount?: number
    notes?: string
  }) => api.put<APIResponse<{ month: number; year: number; planned_budget: number; spent_amount: number; remaining_budget: number; notes: string | null }>>('/compensation/tracker', data),

  trackerRecords: (params: { month: number; year: number }) =>
    api.get<APIResponse<SalaryTrackerRecord[]>>('/compensation/tracker/records', { params }),

  addTrackerRecord: (data: {
    month: number
    year: number
    record_date: string
    title: string
    amount: number
    record_type: 'expense' | 'income' | 'savings'
    notes?: string
  }) => api.post<APIResponse<SalaryTrackerRecord>>('/compensation/tracker/records', data),

  myPayslips: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Payslip>>('/compensation/payslips/mine', { params }),

  allPayslips: (params?: { month?: number; year?: number; employee_id?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Payslip>>('/compensation/payslips', { params }),

  getPayslip: (id: string) =>
    api.get<APIResponse<Payslip>>(`/compensation/payslips/${id}`),

  generatePayslips: (month: number, year: number) =>
    api.post<APIResponse<{
      payroll_run_id: string
      month: number
      year: number
      generated_count: number
      skipped: Array<{ employee_id: string; employee_name: string; reason: string }>
      summary: { total_employees: number; total_gross: number; total_deductions: number; total_net: number }
    }>>('/compensation/payslips/generate', { month, year }),

  uploadPayslip: (payslipId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<APIResponse<Payslip>>(`/compensation/payslips/${payslipId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
