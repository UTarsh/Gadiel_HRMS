import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

const items = [
  { to: '/', icon: 'grid_view', label: 'Home', end: true },
  { to: '/attendance', icon: 'event_available', label: 'Leave' },
  { to: '/salary', icon: 'payments', label: 'Payroll' },
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 py-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 24px rgba(249,115,22,0.08)',
        borderTop: '1px solid rgba(255,217,192,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all"
        >
          {({ isActive }) => (
            <>
              <div
                className="relative w-10 h-8 flex items-center justify-center rounded-xl transition-all"
                style={{ backgroundColor: isActive ? '#FFF7ED' : 'transparent' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: isActive ? '#F97316' : 'var(--c-t3)',
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: '21px',
                  }}
                >
                  {item.icon}
                </span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center font-bold"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-bold"
                style={{
                  color: isActive ? '#F97316' : 'var(--c-t3)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
