import { api } from './client'
import type { APIResponse } from '@/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const aiApi = {
  chat: (messages: ChatMessage[]) =>
    api.post<APIResponse<{ reply: string }>>('/ai/chat', { messages }),
}
