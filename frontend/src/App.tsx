import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { WelcomePage } from '@/pages/auth/WelcomePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { EmployeeDetailPage } from '@/pages/employees/EmployeeDetailPage'
import { EmployeeFormPage } from '@/pages/employees/EmployeeFormPage'
import { GeofencePage } from '@/pages/admin/GeofencePage'
import { SalaryPage } from '@/pages/salary/SalaryPage'
import { MonthlyReportPage } from '@/pages/reports/MonthlyReportPage'
import { useAuthStore } from '@/store/auth'
import { ThemeProvider } from '@/contexts/ThemeContext'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
})

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/salary" element={<SalaryPage />} />
              <Route path="/monthly-report" element={<MonthlyReportPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
              <Route path="/geofence" element={<GeofencePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
