import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { LogOut, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

export function DesktopSidebar() {
  const { employee, logout } = useAuthStore()
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const navigate = useNavigate()

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

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.list({ per_page: 1 }),
    refetchInterval: 30000,
    enabled: !!employee,
  })
  const unread = notifData?.data?.data?.unread_count ?? 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const w = isCollapsed ? 64 : 220

  return (
    <aside
      className="flex flex-col min-h-screen sticky top-0 rounded-r-[2rem] overflow-hidden transition-all duration-200"
      style={{
        width: w,
        minWidth: w,
        backgroundColor: 'var(--c-sidebar)',
        boxShadow: '4px 0 32px rgba(249,115,22,0.06), 0 0 0 1px rgba(249,115,22,0.04)',
      }}
    >
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center gap-3 px-3 pt-7 pb-6', isCollapsed ? 'justify-center px-3' : 'px-6')}>
        {!isCollapsed && (
          <>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              G
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gadiel</p>
              <p className="text-[10px] font-medium truncate" style={{ color: 'var(--c-t3)' }}>HRMS</p>
            </div>
          </>
        )}
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('rounded-xl p-1.5 transition-colors hover:bg-orange-50 shrink-0', isCollapsed && 'mx-auto')}
          style={{ color: 'var(--c-t3)' }}
        >
          {isCollapsed
            ? <PanelLeftOpen size={16} style={{ color: '#F97316' }} />
            : <PanelLeftClose size={16} style={{ color: '#F97316' }} />
          }
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 py-2.5 rounded-[0.875rem] transition-all duration-150 group relative',
                isCollapsed ? 'justify-center px-2' : 'px-3',
                isActive ? '' : 'hover:bg-orange-50'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: '#FFF7ED', color: '#F97316' }
                : { color: 'var(--c-t3)' }
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{
                    fontSize: '20px',
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    color: isActive ? '#F97316' : 'var(--c-t3)',
                  }}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span
                    className="text-sm flex-1 truncate"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#F97316' : 'var(--c-t2)',
                    }}
                  >
                    {item.label}
                  </span>
                )}
                {item.to === '/notifications' && unread > 0 && (
                  <span
                    className={cn('rounded-full text-[10px] text-white flex items-center justify-center font-bold shrink-0', isCollapsed ? 'w-4 h-4 absolute top-1 right-1' : 'w-5 h-5')}
                    style={{ backgroundColor: '#EF4444', fontSize: isCollapsed ? '8px' : undefined }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Profile + Settings */}
      <div className={cn('px-2 pb-6 pt-3 space-y-1', isCollapsed && 'px-2')} style={{ borderTop: '1px solid var(--c-border3)' }}>
        <NavLink
          to="/profile"
          title={isCollapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 py-2.5 rounded-[0.875rem] transition-all duration-150 w-full',
              isCollapsed ? 'justify-center px-2' : 'px-3',
              isActive ? '' : 'hover:bg-orange-50'
            )
          }
          style={({ isActive }) =>
            isActive
              ? { backgroundColor: '#FFF7ED', color: '#F97316' }
              : { color: 'var(--c-t3)' }
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={18}
                style={{ color: isActive ? '#F97316' : 'var(--c-t3)' }}
                className="shrink-0"
              />
              {!isCollapsed && (
                <span
                  className="text-sm flex-1 truncate"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#F97316' : 'var(--c-t2)',
                  }}
                >
                  Settings
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* User row */}
        {employee && (
          <div className={cn('flex items-center gap-2.5 p-2 rounded-2xl mt-1', isCollapsed ? 'justify-center' : '')} style={{ backgroundColor: 'var(--c-surface)' }}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={employee.profile_picture_url || undefined} />
              <AvatarFallback
                className="text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)', color: '#fff' }}
              >
                {getInitials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {employee.first_name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--c-t3)' }}>
                    {employee.emp_code}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors hover:bg-red-50"
                  title="Sign out"
                >
                  <LogOut size={14} style={{ color: '#EF4444' }} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
