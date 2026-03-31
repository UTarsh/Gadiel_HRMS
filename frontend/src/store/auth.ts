import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmployeeDetail } from '@/types'

/**
 * Auth store — holds the employee profile and authentication state.
 *
 * Tokens are NOT stored here. The backend sets httpOnly cookies
 * (access_token, refresh_token) on login/refresh. The browser manages
 * them automatically — invisible to JavaScript, protected against XSS.
 *
 * The `employee` object is persisted so the UI renders correctly on
 * page reload without a network round-trip. It contains no secrets.
 */
interface AuthState {
  employee: EmployeeDetail | null
  isAuthenticated: boolean
  setEmployee: (employee: EmployeeDetail) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      employee: null,
      isAuthenticated: false,

      setEmployee: (employee) => set({ employee, isAuthenticated: true }),

      /** Clears local UI state. Token cookies are cleared server-side via POST /auth/logout. */
      logout: () => set({ employee: null, isAuthenticated: false }),
    }),
    {
      name: 'hrms-auth',
      partialize: (state) => ({
        employee: state.employee,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
