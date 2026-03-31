import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { FloatingBot } from '@/components/shared/FloatingBot'

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <SidebarProvider>
      <Sidebar />
      <div className="flex flex-col min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--c-bg)' }}>
        <Header />
        <main className="flex-1 px-4 md:px-8 py-8 max-w-[1440px] mx-auto w-full">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
        <FloatingBot />
        <BottomNav />
      </div>
    </SidebarProvider>
  )
}
