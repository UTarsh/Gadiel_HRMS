import { api } from './client'
import type { APIResponse, TokenResponse, EmployeeDetail } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<APIResponse<TokenResponse>>('/auth/login', { email, password }),

  refresh: (refresh_token: string) =>
    api.post<APIResponse<TokenResponse>>('/auth/refresh', { refresh_token }),

  me: () => api.get<APIResponse<EmployeeDetail>>('/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    api.post<APIResponse<null>>('/auth/change-password', { current_password, new_password }),

  verifyEmail: (email: string) =>
    api.post<APIResponse<{ first_name: string; has_password: boolean }>>('/auth/verify-email', { email }),

  setupPassword: (email: string, password: string, confirm_password: string) =>
    api.post<APIResponse<TokenResponse>>('/auth/setup-password', { email, password, confirm_password }),
}
