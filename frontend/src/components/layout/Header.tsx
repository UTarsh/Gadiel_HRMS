import { useNavigate } from 'react-router-dom'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/auth'
import { getInitials, formatTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { employeesApi } from '@/api/employees'
import { attendanceApi } from '@/api/attendance'
import { useState, useRef, useEffect } from 'react'
import type { Employee } from '@/types'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function Header() {
  const { employee, logout } = useAuthStore()
  const navigate = useNavigate()
  const { toggle } = useSidebar()
  const { isDark, toggle: toggleTheme } = useTheme()
  const isManagerOrHr = employee?.role === 'hr_admin' || employee?.role === 'super_admin' || employee?.role === 'manager'

  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [attPopoverOpen, setAttPopoverOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.list({ per_page: 1 }),
    refetchInterval: 30000,
    enabled: !!employee,
  })
  const unreadCount = notifData?.data?.data?.unread_count ?? 0

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ['employee-search', debouncedQuery],
    queryFn: () => employeesApi.list({ search: debouncedQuery, per_page: 6 }),
    enabled: debouncedQuery.length >= 2,
  })

  const { data: attData, isFetching: attFetching } = useQuery({
    queryKey: ['emp-today-att', selectedEmp?.id],
    queryFn: () => attendanceApi.todayForEmployee(selectedEmp!.id),
    enabled: !!selectedEmp && attPopoverOpen,
  })

  const searchResults: Employee[] = searchData?.data?.data ?? []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setAttPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelectEmployee(emp: Employee) {
    setSelectedEmp(emp)
    setSearchQuery(emp.full_name)
    setDropdownOpen(false)
    setAttPopoverOpen(true)
  }

  function handleSearchInput(val: string) {
    setSearchQuery(val)
    setAttPopoverOpen(false)
    setSelectedEmp(null)
    setDropdownOpen(val.length >= 2)
  }

  const todayAtt = attData?.data?.data

  const attStatusColor = (status?: string | null) => {
    if (!status) return '#94A3B8'
    const map: Record<string, string> = {
      present: '#16A34A', late: '#D97706', absent: '#DC2626',
      on_leave: '#3B82F6', wfh: '#8B5CF6', half_day: '#F59E0B',
      holiday: '#0EA5E9', week_off: '#94A3B8',
    }
    return map[status] ?? '#94A3B8'
  }

  return (
    <header
      className="w-full sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5"
      style={{
        backgroundColor: 'var(--c-header)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--c-border)',
      }}
    >
      {/* Left: hamburger + branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--c-t2)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--c-surface)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
        </button>

        <Link to="/" className="flex items-center shrink-0">
          <img
            src="/gadiel_logo.png"
            alt="Gadiel Technologies"
            className="hidden sm:block"
            style={{ height: '32px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
        </Link>

        {/* Functional employee search */}
        <div ref={searchRef} className="relative hidden lg:block ml-2">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontSize: '18px', color: 'var(--c-t3)' }}>search</span>
          <input
            className="border-none rounded-full pl-10 pr-5 py-2 w-64 focus:ring-2 focus:ring-blue-200 text-sm outline-none transition-all focus:w-72"
            placeholder="Search employees..."
            style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t1)' }}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
          />
          {isSearching && (
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" style={{ fontSize: '16px', color: 'var(--c-t3)' }}>progress_activity</span>
          )}

          {/* Search results dropdown */}
          {dropdownOpen && searchResults.length > 0 && (
            <div
              className="absolute top-full mt-2 left-0 w-80 rounded-2xl overflow-hidden z-50"
              style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 8px 30px rgba(30,41,59,0.18)', border: '1px solid var(--c-border3)' }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--c-border3)' }}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--c-t3)' }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
              </div>
              {searchResults.map((emp) => (
                <button
                  key={emp.id}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  style={{ borderBottom: '1px solid var(--c-border3)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--c-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => handleSelectEmployee(emp)}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={emp.profile_picture_url || undefined} />
                    <AvatarFallback className="text-[10px] font-bold" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff' }}>
                      {getInitials(emp.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-t1)' }}>{emp.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--c-t3)' }}>{emp.designation?.name || emp.department?.name || emp.emp_code}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: emp.employment_status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(148,163,184,0.15)',
                      color: emp.employment_status === 'active' ? '#16A34A' : '#64748B'
                    }}>
                    {emp.employment_status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Attendance popover for selected employee */}
          {attPopoverOpen && selectedEmp && (
            <div
              className="absolute top-full mt-2 left-0 w-80 rounded-2xl z-50 overflow-hidden"
              style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 8px 30px rgba(30,41,59,0.18)', border: '1px solid var(--c-border3)' }}
            >
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--c-border3)', background: 'linear-gradient(135deg,var(--c-surface),var(--c-surface2))' }}>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={selectedEmp.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xs font-bold" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff' }}>
                    {getInitials(selectedEmp.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--c-t1)' }}>{selectedEmp.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--c-t2)' }}>{selectedEmp.designation?.name || selectedEmp.department?.name}</p>
                </div>
                <button onClick={() => navigate(`/employees/${selectedEmp.id}`)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                  Profile
                </button>
              </div>

              <div className="p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: 'var(--c-t3)' }}>Today's Attendance</p>
                {attFetching ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-blue-400" style={{ fontSize: '18px' }}>progress_activity</span>
                    <span className="text-sm" style={{ color: 'var(--c-t3)' }}>Loading...</span>
                  </div>
                ) : !isManagerOrHr ? (
                  <p className="text-sm" style={{ color: 'var(--c-t3)' }}>Attendance access is for managers and HR only</p>
                ) : todayAtt ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: attStatusColor(todayAtt.status) }} />
                      <span className="text-sm font-bold capitalize" style={{ color: attStatusColor(todayAtt.status) }}>
                        {todayAtt.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3" style={{ backgroundColor: isDark ? 'rgba(22,163,74,0.1)' : '#F0FDF4' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--c-t3)' }}>Punch In</p>
                        <p className="text-sm font-extrabold" style={{ color: '#16A34A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {todayAtt.punch_in ? formatTime(todayAtt.punch_in) : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : '#FFF1F2' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--c-t3)' }}>Punch Out</p>
                        <p className="text-sm font-extrabold" style={{ color: '#DC2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {todayAtt.punch_out ? formatTime(todayAtt.punch_out) : '—'}
                        </p>
                      </div>
                    </div>
                    {todayAtt.working_minutes ? (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--c-t2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>timer</span>
                        {Math.floor(todayAtt.working_minutes / 60)}h {todayAtt.working_minutes % 60}m worked
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                    <span className="text-sm font-semibold" style={{ color: '#DC2626' }}>Absent today</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: theme toggle + notification + avatar */}
      <div className="flex items-center gap-2">

        {/* Dark / Light toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
          style={{ color: isDark ? '#60A5FA' : '#475569' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--c-surface)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : <Moon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
        </button>

        <Link to="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors" style={{ color: 'var(--c-t2)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--c-surface)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#DC2626' }} />
          )}
        </Link>

        {employee && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full overflow-hidden border-2 focus:outline-none" style={{ borderColor: '#DBEAFE' }}>
                <Avatar className="h-full w-full">
                  <AvatarImage src={employee.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#fff' }}>
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 mt-2" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)', boxShadow: '0 8px 30px rgba(30,41,59,0.18)' }}>
              <DropdownMenuLabel className="px-3 py-2.5 rounded-xl">
                <p className="font-semibold" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{employee.full_name}</p>
                <p className="text-xs font-normal mt-0.5" style={{ color: 'var(--c-t2)' }}>{employee.email}</p>
                <p className="text-xs font-normal" style={{ color: 'var(--c-t3)' }}>{employee.emp_code}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ backgroundColor: 'var(--c-border3)' }} />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl px-3 py-2.5 cursor-pointer" style={{ color: 'var(--c-t1)' }}>
                <User className="mr-2.5 h-4 w-4" style={{ color: '#3B82F6' }} /> My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ backgroundColor: 'var(--c-border3)' }} />
              <DropdownMenuItem onClick={logout} className="rounded-xl px-3 py-2.5 cursor-pointer" style={{ color: '#DC2626' }}>
                <LogOut className="mr-2.5 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
