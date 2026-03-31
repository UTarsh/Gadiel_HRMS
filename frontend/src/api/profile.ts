import { api } from './client'
import type { APIResponse } from '@/types'

export interface UserProfile {
  avatar_url?: string | null
  ghibli_image_url?: string | null
  custom_title?: string | null   // user-editable display title (overrides designation badge)
  bio?: string | null
  birthday?: string | null
  birthplace?: string | null
  guardian_name?: string | null
  phone?: string | null
  blood_group?: string | null
  gender?: string | null
  marital_status?: string | null
  education?: string | null
  skills?: string[] | null
  interests?: string[] | null
  certifications?: CertItem[] | null
  badges?: BadgeItem[] | null
  assets?: AssetItem[] | null
  linkedin_url?: string | null
  github_url?: string | null
  coding_profile_url?: string | null
}

export interface CertItem {
  name: string
  issuer?: string
  progress: number      // 0–100; 100 = completed/earned
  badge_url?: string    // link to badge/certificate when earned
}

export interface BadgeItem {
  name: string
  desc: string
  icon: string
  earned: boolean
}

export interface AssetItem {
  name: string    // e.g. "Laptop", "Charger", "Bag"
  serial: string  // serial / asset code
  emoji: string   // auto-detected from name, e.g. "💻"
  status: string  // "Active" | "Returned" | "Under Repair"
}

export interface MyProfileResponse {
  id: string
  emp_code: string
  full_name: string
  email: string
  date_of_joining?: string | null
  role?: string | null
  employment_type?: string | null
  employment_status?: string | null
  work_location?: string | null
  department?: { id: string; name: string } | null
  designation?: { id: string; name: string } | null
  profile: UserProfile | null
}

export const profileApi = {
  getMe: () => api.get<APIResponse<MyProfileResponse>>('/profile/me'),

  update: (data: Partial<UserProfile>) =>
    api.patch<APIResponse<UserProfile>>('/profile/me', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<APIResponse<{ avatar_url: string }>>('/profile/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadGhibliImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<APIResponse<{ ghibli_image_url: string }>>('/profile/me/ghibli', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

/** Convert a relative avatar_url from the API to a full URL for display.
 *  Pass a `ts` timestamp to bust the browser cache after a fresh upload. */
export function resolveAvatarUrl(avatarUrl: string | null | undefined, ts?: number): string | null {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  const apiUrl = import.meta.env.VITE_API_URL || '/api/v1'
  const base = (apiUrl as string).replace('/api/v1', '')
  const url = `${base}${avatarUrl}`
  return ts ? `${url}?t=${ts}` : url
}
