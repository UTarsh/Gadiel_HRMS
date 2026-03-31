import { api } from './client'
import type { APIResponse, NotificationsResponse } from '@/types'

export const notificationsApi = {
  list: (params?: { page?: number; per_page?: number; unread_only?: boolean }) =>
    api.get<APIResponse<NotificationsResponse>>('/notifications', { params }),

  markRead: (id: string) => api.patch<APIResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<APIResponse<null>>('/notifications/read-all'),
}
