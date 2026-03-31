import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  // Send httpOnly cookies with every request (set by the backend on login/refresh).
  // The browser manages the cookie lifecycle — no manual token handling needed here.
})

// No request interceptor for token attachment — the browser sends the
// access_token httpOnly cookie automatically.

// On 401: attempt a silent cookie-based refresh, then retry the original request.
// If refresh also fails, clear client state and redirect to /login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        // POST to /auth/refresh — the browser automatically sends the
        // refresh_token cookie; the backend sets a new access_token cookie.
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        // Retry the original request — it will now carry the new access_token cookie.
        return api(original)
      } catch {
        // Refresh failed (token expired / revoked) — clear state and force login
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)
