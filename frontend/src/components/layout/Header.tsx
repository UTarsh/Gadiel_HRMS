import { useNavigate } from 'react-router-dom'
import { LogOut, User, Sun, Moon, Bell } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { employeesApi } from '@/api/employees'
import { attendanceApi } from '@/api/attendance'
import { useState, useRef, useEffect } from 'react'
import { formatTime } from '@/lib/utils'
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

  const { data: attData } = useQuery({
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
    const map: Record<string, string> = {
      present: '#22C55E', late: '#EAB308', absent: '#EF4444',
      on_leave: '#3B82F6', wfh: '#8B5CF6', half_day: '#F59E0B',
      holiday: '#0EA5E9', week_off: '#9CA3AF',
    }
    return map[status ?? ''] ?? '#9CA3AF'
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header
      className="w-full sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3"
      style={{
        backgroundColor: 'var(--c-header)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--c-border)',
      }}
    >
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-3 flex-1">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-orange-50"
          style={{ color: 'var(--c-t2)' }}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
        </button>

        {/* Search bar */}
        <div ref={searchRef} className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: '18px', color: 'var(--c-t3)' }}>
            search
          </span>
          <input
            className="w-full rounded-full pl-9 pr-4 py-2 text-sm outline-none transition-all"
            placeholder="Search employees..."
            style={{
              backgroundColor: 'var(--c-surface)',
              border: '1.5px solid var(--c-border2)',
              color: 'var(--c-t1)',
            }}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
          />
          {isSearching && (
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ fontSize: '14px', color: 'var(--c-t3)' }}>
              progress_activity
            </span>
          )}

          {/* Search dropdown */}
          {dropdownOpen && searchResults.length > 0 && (
            <div
              className="absolute top-full mt-2 left-0 w-80 rounded-2xl overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--c-card)',
                boxShadow: '0 8px 30px rgba(249,115,22,0.12)',
                border: '1px solid var(--c-border3)',
              }}
            >
              {searchResults.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={emp.profile_picture_url || undefined} />
                    <AvatarFallback className="text-[10px] font-bold" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
                      {getInitials(emp.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-t1)' }}>{emp.full_name}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--c-t3)' }}>
                      {emp.designation?.name || emp.role?.replace(/_/g, ' ')} · {emp.emp_code}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Attendance popover */}
          {attPopoverOpen && selectedEmp && (
            <div
              className="absolute top-full mt-2 left-0 w-72 rounded-2xl p-4 z-50"
              style={{
                backgroundColor: 'var(--c-card)',
                boxShadow: '0 8px 30px rgba(249,115,22,0.12)',
                border: '1px solid var(--c-border3)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedEmp.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xs font-bold" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
                    {getInitials(selectedEmp.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--c-t1)' }}>{selectedEmp.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--c-t3)' }}>Today's attendance</p>
                </div>
              </div>
              {todayAtt ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--c-t3)' }}>Status</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: attStatusColor(todayAtt.status) + '22',
                        color: attStatusColor(todayAtt.status),
                      }}
                    >
                      {todayAtt.status?.replace(/_/g, ' ') ?? 'Unknown'}
                    </span>
                  </div>
                  {todayAtt.punch_in && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--c-t3)' }}>Punch In</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--c-t1)' }}>{formatTime(todayAtt.punch_in)}</span>
                    </div>
                  )}
                  {todayAtt.punch_out && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--c-t3)' }}>Punch Out</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--c-t1)' }}>{formatTime(todayAtt.punch_out)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--c-t3)' }}>No record for today</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: theme toggle + bell + profile */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-orange-50"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark
            ? <Sun size={17} style={{ color: '#F97316' }} />
            : <Moon size={17} style={{ color: 'var(--c-t2)' }} />
          }
        </button>

        {/* Bell */}
        <Link
          to="/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-orange-50"
        >
          <Bell size={17} style={{ color: 'var(--c-t2)' }} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: '#EF4444' }}
            />
          )}
        </Link>

        {/* Profile dropdown */}
        {employee && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:bg-orange-50 ml-1" style={{ border: '1.5px solid var(--c-border2)' }}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={employee.profile_picture_url || undefined} />
                  <AvatarFallback className="text-[10px] font-bold" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Profile
                </span>
                <span className="material-symbols-outlined hidden sm:block" style={{ fontSize: '16px', color: 'var(--c-t3)' }}>expand_more</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl p-2 mt-2"
              style={{
                backgroundColor: 'var(--c-card)',
                border: '1px solid var(--c-border2)',
                boxShadow: '0 8px 30px rgba(249,115,22,0.12)',
              }}
            >
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-sm font-bold" style={{ color: 'var(--c-t1)' }}>{employee.full_name}</p>
                <p className="text-xs font-normal" style={{ color: 'var(--c-t3)' }}>{employee.emp_code}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ backgroundColor: 'var(--c-border3)' }} />
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="rounded-xl px-3 py-2 cursor-pointer hover:bg-orange-50 transition-colors"
              >
                <User size={15} className="mr-2" style={{ color: 'var(--c-t3)' }} />
                <span className="text-sm" style={{ color: 'var(--c-t2)' }}>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl px-3 py-2 cursor-pointer hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} className="mr-2" style={{ color: '#EF4444' }} />
                <span className="text-sm" style={{ color: '#EF4444' }}>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
