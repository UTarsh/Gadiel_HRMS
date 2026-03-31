import { api } from './client'
import type { APIResponse, MonthlyReport } from '@/types'

export const reportsApi = {
  monthly: (month: number, year: number) =>
    api.get<APIResponse<MonthlyReport>>('/reports/monthly', { params: { month, year } }),
}
