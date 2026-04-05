import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { Sidebar } from './Sidebar'
import { DesktopSidebar } from './DesktopSidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { FloatingBot } from '@/components/shared/FloatingBot'
import { BirthdayBanner } from '@/components/shared/BirthdayBanner'

function AppShell() {
  return (
    <>
      {/* Full-screen gradient background with bokeh */}
      <div className="app-bg" aria-hidden="true">
        <div className="bokeh-1" />
        <div className="bokeh-2" />
        <div className="bokeh-3" />
      </div>

      {/* Mobile drawer sidebar */}
      <Sidebar />

      {/* App shell: desktop sidebar + content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Desktop persistent sidebar — hidden on mobile */}
        <div className="hidden md:flex shrink-0">
          <DesktopSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0">
          <BirthdayBanner />
          <Header />
          <main className="flex-1 px-4 md:px-6 py-6 w-full pb-24 md:pb-8">
            <div className="page-enter max-w-[1400px] mx-auto">
              <Outlet />
            </div>
          </main>
          <FloatingBot />
          <BottomNav />
        </div>
      </div>
    </>
  )
}

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <SidebarProvider>
      <AppShell />
    </SidebarProvider>
  )
}
