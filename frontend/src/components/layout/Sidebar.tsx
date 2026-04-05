import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useSidebar } from '@/contexts/SidebarContext'
import { LogOut, Settings } from 'lucide-react'

export function Sidebar() {
  const { employee, logout } = useAuthStore()
  const { isOpen, close } = useSidebar()
  const navigate = useNavigate()
  const touchStartX = useRef<number | null>(null)

  const isHrOrAdmin = employee?.role === 'hr_admin' || employee?.role === 'super_admin'
  const canViewMonthlyReport =
    isHrOrAdmin ||
    ['vishal', 'namrata'].includes((employee?.first_name || '').toLowerCase())

  const navItems = [
    { to: '/', icon: 'grid_view', label: 'Dashboard', end: true },
    { to: '/attendance', icon: 'event_available', label: 'Leave & Attendance' },
    { to: '/salary', icon: 'payments', label: 'Payroll' },
    { to: '/notifications', icon: 'notifications', label: 'Notifications' },
    ...(canViewMonthlyReport
      ? [{ to: '/monthly-report', icon: 'monitoring', label: 'Monthly Report' }]
      : []),
    ...(isHrOrAdmin
      ? [{ to: '/geofence', icon: 'location_on', label: 'Geofence' }]
      : []),
  ]

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    if (touchStartX.current - e.changedTouches[0].clientX > 60) close()
    touchStartX.current = null
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.list({ per_page: 1 }),
    refetchInterval: 30000,
    enabled: !!employee,
  })
  const unread = notifData?.data?.data?.unread_count ?? 0

  const handleLogout = () => {
    close()
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        onClick={close}
        className="fixed inset-0 z-40 transition-all duration-300 md:hidden"
        style={{
          backgroundColor: 'rgba(26,26,46,0.5)',
          backdropFilter: isOpen ? 'blur(2px)' : 'none',
          WebkitBackdropFilter: isOpen ? 'blur(2px)' : 'none',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel — mobile only */}
      <aside
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 ease-out md:hidden"
        style={{
          backgroundColor: 'var(--c-sidebar)',
          boxShadow: '8px 0 40px rgba(249,115,22,0.12)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--c-border3)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              G
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Gadiel HRMS
            </p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--c-t3)' }}>close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={close}
              className={({ isActive }) =>
                cn('flex items-center gap-4 py-3 pl-4 pr-3 rounded-2xl transition-all duration-150',
                  isActive ? '' : 'hover:bg-orange-50')
              }
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: '#FFF7ED' }
                  : {}
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '20px',
                      fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                      color: isActive ? '#F97316' : 'var(--c-t3)',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="text-sm flex-1"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#F97316' : 'var(--c-t2)',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.to === '/notifications' && unread > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: '#EF4444' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          <NavLink
            to="/profile"
            onClick={close}
            className={({ isActive }) =>
              cn('flex items-center gap-4 py-3 pl-4 pr-3 rounded-2xl transition-all duration-150',
                isActive ? '' : 'hover:bg-orange-50')
            }
            style={({ isActive }) => isActive ? { backgroundColor: '#FFF7ED' } : {}}
          >
            {({ isActive }) => (
              <>
                <Settings size={20} style={{ color: isActive ? '#F97316' : 'var(--c-t3)', flexShrink: 0 }} />
                <span
                  className="text-sm flex-1"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#F97316' : 'var(--c-t2)',
                  }}
                >
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </nav>

        {/* User footer */}
        {employee && (
          <div className="px-4 pb-6 pt-3" style={{ borderTop: '1px solid var(--c-border3)' }}>
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--c-surface)' }}>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={employee.profile_picture_url || undefined} />
                <AvatarFallback className="text-xs font-bold" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {employee.full_name}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--c-t3)' }}>{employee.emp_code}</p>
              </div>
              <button onClick={handleLogout} className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors" title="Sign out">
                <LogOut size={14} style={{ color: '#EF4444' }} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
