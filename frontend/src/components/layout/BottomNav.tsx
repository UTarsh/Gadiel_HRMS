import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

const items = [
  { to: '/', icon: 'grid_view', label: 'Home', end: true },
  { to: '/attendance', icon: 'fingerprint', label: 'Attendance' },
  { to: '/salary', icon: 'payments', label: 'Salary' },
  { to: '/notifications', icon: 'notifications', label: 'Alerts' },
]

export function BottomNav() {
  const { employee } = useAuthStore()
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.list({ per_page: 1 }),
    refetchInterval: 30000,
    enabled: !!employee,
  })
  const unreadCount = notifData?.data?.data?.unread_count ?? 0

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-2 flex justify-around items-center glass-panel"
      style={{
        backgroundColor: 'var(--c-header)',
        boxShadow: '0 -8px 30px rgba(15,23,42,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid var(--c-border)',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: isActive ? '#3B82F6' : 'var(--c-t3)',
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: '22px',
                  }}
                >
                  {item.icon}
                </span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: '#DC2626' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold" style={{ color: isActive ? '#2563EB' : 'var(--c-t3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
