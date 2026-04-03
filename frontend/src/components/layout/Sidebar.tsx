import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useSidebar } from '@/contexts/SidebarContext'

export function Sidebar() {
  const { employee } = useAuthStore()
  const { isOpen, close } = useSidebar()
  const touchStartX = useRef<number | null>(null)
  const canViewMonthlyReport =
    employee?.role === 'hr_admin' ||
    employee?.role === 'super_admin' ||
    ['vishal', 'namrata'].includes((employee?.first_name || '').toLowerCase())

  const navItems = [
    { to: '/', icon: 'grid_view', label: 'Dashboard', end: true },
    { to: '/attendance', icon: 'fingerprint', label: 'Attendance & Leaves' },
    { to: '/notifications', icon: 'notifications', label: 'Notifications' },
    { to: '/salary', icon: 'payments', label: 'Salary & Payslips' },
    ...(canViewMonthlyReport ? [{ to: '/monthly-report', icon: 'monitoring', label: 'Monthly Report' }] : []),
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(15,23,42,0.5)',
          backdropFilter: isOpen ? 'blur(2px)' : 'none',
          WebkitBackdropFilter: isOpen ? 'blur(2px)' : 'none',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <aside
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 ease-out"
        style={{
          backgroundColor: 'var(--c-sidebar)',
          boxShadow: '8px 0 40px rgba(30,41,59,0.18)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Top row: logo + close */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--c-border3)' }}>
          <div className="flex items-center gap-3">
            <img src="/gadiel_logo.png" alt="Gadiel Technologies" style={{ height: '36px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" aria-label="Close"
            style={{ color: 'var(--c-t3)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--c-surface)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Drag pill hint */}
        <div className="flex justify-center py-1.5">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--c-border2)' }} />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={close}
              className={({ isActive }) =>
                cn('flex items-center gap-4 py-3 pl-4 pr-3 rounded-xl transition-all duration-150',
                  isActive ? 'font-bold' : '')
              }
              style={({ isActive }) => isActive
                ? { backgroundColor: 'var(--c-surface)', color: '#2563EB' }
                : { color: 'var(--c-t3)' }
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.icon}
                  </span>
                  <span className="text-sm flex-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>
                  {item.to === '/notifications' && unread > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: '#DC2626' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {(employee?.role === 'hr_admin' || employee?.role === 'super_admin') && (
            <NavLink
              to="/geofence"
              onClick={close}
              className={({ isActive }) =>
                cn('flex items-center gap-4 py-3 pl-4 pr-3 rounded-xl transition-all duration-150',
                  isActive ? 'font-bold' : '')
              }
              style={({ isActive }) => isActive
                ? { backgroundColor: 'var(--c-surface)', color: '#2563EB' }
                : { color: 'var(--c-t3)' }
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>location_on</span>
                  <span className="text-sm flex-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: isActive ? 700 : 500 }}>Geofence</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        {employee && (
          <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--c-border3)' }}>
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--c-surface)' }}>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={employee.profile_picture_url || undefined} />
                <AvatarFallback className="text-xs font-bold" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#fff' }}>
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{employee.full_name}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--c-t3)' }}>{employee.emp_code}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
