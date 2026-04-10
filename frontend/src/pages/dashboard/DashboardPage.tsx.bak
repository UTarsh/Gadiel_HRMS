import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { employeesApi } from '@/api/employees'
import { leavesApi } from '@/api/leaves'
import { attendanceApi } from '@/api/attendance'
import { notificationsApi } from '@/api/notifications'
import { profileApi, resolveAvatarUrl } from '@/api/profile'
import { formatDate, formatTime, getInitials } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { LeaveRequest, Employee } from '@/types'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { AdjustableImageUpload } from '@/components/shared/AdjustableImageUpload'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Good night',    emoji: '🌙' }
  if (h < 12) return { text: 'Good morning',  emoji: '☀️' }
  if (h < 17) return { text: 'Good afternoon',emoji: '🚀' }
  if (h < 21) return { text: 'Good evening',  emoji: '✨' }
  return       { text: 'Good night',          emoji: '🌟' }
}

function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

function getPerfLabel(pct: number) {
  if (pct >= 95) return 'Excellent'
  if (pct >= 85) return 'Good'
  if (pct >= 70) return 'Average'
  return 'Needs Work'
}

// ─── Org Tree ─────────────────────────────────────────────────────────────────

function getConnectorStyle(isFirst: boolean, isLast: boolean, isSingle: boolean): React.CSSProperties {
  const color = '#F97316'
  if (isSingle) return { display: 'none' }
  if (isFirst)  return { background: `linear-gradient(to right, transparent 50%, ${color} 50%)`, height: 2 }
  if (isLast)   return { background: `linear-gradient(to right, ${color} 50%, transparent 50%)`, height: 2 }
  return { backgroundColor: color, height: 2 }
}

interface OrgNodeProps {
  emp: Employee
  allEmployees: Employee[]
  depth?: number
  isDark: boolean
  onClickEmp: (id: string) => void
}

function OrgTreeNode({ emp, allEmployees, depth = 0, isDark, onClickEmp }: OrgNodeProps) {
  const children = allEmployees
    .filter(e => e.reporting_manager_id === emp.id)
    .slice()
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  const cardStyles: Record<number, React.CSSProperties> = {
    0: { background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff', boxShadow: '0 8px 24px rgba(249,115,22,0.30)' },
    1: {
      background: isDark ? '#1A1A30' : 'var(--c-card)',
      color: isDark ? '#E8E8F0' : '#1A1A2E',
      border: `1.5px solid ${isDark ? '#2A2A48' : '#F97316'}`,
      boxShadow: '0 4px 12px rgba(249,115,22,0.08)',
    },
    2: {
      background: isDark ? '#12122A' : 'var(--c-card)',
      color: isDark ? '#9B9BB4' : '#1A1A2E',
      border: `1.5px solid ${isDark ? '#1E1E38' : '#FFD9C0'}`,
    },
  }
  const style = cardStyles[Math.min(depth, 2)]
  const isDeep = depth >= 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        onClick={() => onClickEmp(emp.id)}
        className="rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{ ...style, padding: isDeep ? '10px 14px' : '12px 18px', minWidth: isDeep ? 140 : 180, maxWidth: 260, textAlign: 'left' }}
      >
        <div className="flex items-center gap-2.5">
          <Avatar className={isDeep ? 'h-7 w-7 shrink-0' : 'h-9 w-9 shrink-0'}>
            <AvatarImage src={resolveAvatarUrl((emp.ghibli_image_url ?? emp.profile_picture_url) || undefined) || undefined} />
            <AvatarFallback
              className="text-[10px] font-bold"
              style={{ background: depth === 0 ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}
            >
              {getInitials(emp.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className={`font-bold leading-tight break-words ${isDeep ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: depth === 0 ? '#fff' : (isDark ? '#E8E8F0' : '#1A1A2E'), fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {emp.full_name}
            </p>
            <p className={`break-words ${isDeep ? 'text-[9px]' : 'text-[10px]'} mt-0.5`}
              style={{ color: depth === 0 ? 'rgba(255,255,255,0.8)' : (isDark ? '#6B6B84' : '#6B7280') }}>
              {emp.designation?.name || (emp.role || 'Employee').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </button>

      {children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 20, backgroundColor: '#F97316' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === children.length - 1
              const isSingle = children.length === 1
              return (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', ...getConnectorStyle(isFirst, isLast, isSingle) }} />
                  <div style={{ width: 2, height: 20, backgroundColor: isSingle ? 'transparent' : '#F97316' }} />
                  <div style={{ paddingLeft: 10, paddingRight: 10 }}>
                    <OrgTreeNode emp={child} allEmployees={allEmployees} depth={depth + 1} isDark={isDark} onClickEmp={onClickEmp} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function OrgChartSection({ employees, currentEmployeeId }: { employees: Employee[]; currentEmployeeId?: string }) {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const roots = useMemo(() => {
    const ids = new Set(employees.map(e => e.id))
    return employees
      .filter(e => !e.reporting_manager_id || !ids.has(e.reporting_manager_id))
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [employees])

  if (roots.length === 0) return null

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 4px 24px rgba(249,115,22,0.06)', border: '1px solid var(--c-border2)' }}>
      <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border3)' }}>
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>account_tree</span>
            </span>
            Organization Chart
          </h3>
          <p className="text-xs mt-1 ml-10" style={{ color: 'var(--c-t3)' }}>
            {employees.length} people · complete hierarchy
          </p>
        </div>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-orange-50"
          style={{ color: '#F97316', backgroundColor: '#FFF7ED' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{collapsed ? 'unfold_more' : 'unfold_less'}</span>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div className="p-6 overflow-x-auto">
          <div className="inline-flex min-w-full items-start justify-center gap-12">
            {roots.map((root) => (
              <OrgTreeNode
                key={root.id}
                emp={root}
                allEmployees={employees}
                depth={0}
                isDark={isDark}
                onClickEmp={(id) => navigate(id === currentEmployeeId ? '/profile' : `/employees/${id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Road to Goal Chart ───────────────────────────────────────────────────────

function RoadToGoalChart({ currentPct }: { currentPct: number }) {
  // Build a smooth rising curve from 0% to current pct across the month
  const now = new Date()
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayNum = now.getDate()

  const data = Array.from({ length: dayNum }, (_, i) => {
    const d = i + 1
    const pct = Math.round((d / monthDays) * 100 * (currentPct / 100))
    return { day: d, value: pct }
  })

  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={Math.floor(dayNum / 4)} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #FFD9C0', borderRadius: '12px', fontSize: '11px' }}
          formatter={(v: number) => [`${v}%`, 'Progress']}
          labelFormatter={(l) => `Day ${l}`}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#F97316"
          strokeWidth={2.5}
          fill="url(#goalGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#F97316', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Attendance Today Widget ──────────────────────────────────────────────────

type AttEmp = { id: string; full_name: string; emp_code: string; status: string; punch_in?: string | null }

const ATT_STATUS_CFG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  present:        { bg: 'rgba(34,197,94,0.08)',  color: '#16A34A', dot: '#22C55E', label: 'Present' },
  late:           { bg: 'rgba(234,179,8,0.08)',  color: '#B45309', dot: '#EAB308', label: 'Late' },
  wfh:            { bg: 'rgba(139,92,246,0.08)', color: '#7C3AED', dot: '#8B5CF6', label: 'WFH' },
  absent:         { bg: 'rgba(239,68,68,0.08)',  color: '#DC2626', dot: '#EF4444', label: 'Absent' },
  on_leave:       { bg: 'rgba(59,130,246,0.08)', color: '#2563EB', dot: '#3B82F6', label: 'On Leave' },
  not_checked_in: { bg: 'rgba(148,163,184,0.08)',color: '#64748B', dot: '#94A3B8', label: 'Not Checked In' },
}

function AttendanceTodayWidget({ employeesToday, navigate }: { employeesToday: any[]; navigate: any }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const presentList  = employeesToday.filter(e => ['present', 'late', 'wfh'].includes(e.status))
  const absentList   = employeesToday.filter(e => e.status === 'absent')
  const notInList    = employeesToday.filter(e => e.status === 'not_checked_in' || e.status === 'on_leave')

  const cards = [
    { key: 'present', label: 'Present',        count: presentList.length,  list: presentList,  gradient: 'linear-gradient(135deg,#16A34A,#22C55E)', glow: 'rgba(34,197,94,0.20)',  icon: 'how_to_reg' },
    { key: 'absent',  label: 'Absent',          count: absentList.length,   list: absentList,   gradient: 'linear-gradient(135deg,#DC2626,#EF4444)', glow: 'rgba(239,68,68,0.20)',  icon: 'person_off' },
    { key: 'not_in',  label: 'Not Checked In',  count: notInList.length,    list: notInList,    gradient: 'linear-gradient(135deg,#64748B,#94A3B8)', glow: 'rgba(148,163,184,0.20)',icon: 'pending_actions' },
  ]

  return (
    <div
      className="rounded-[24px] overflow-hidden"
      style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 4px 24px rgba(249,115,22,0.06)', border: '1px solid var(--c-border2)' }}
    >
      <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border3)' }}>
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>groups</span>
            </span>
            Employee Attendance — Today
          </h3>
          <p className="text-xs mt-1 ml-10" style={{ color: 'var(--c-t3)' }}>
            Click a card to see who's in each group
          </p>
        </div>
      </div>

      {/* ── 3 summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
        {cards.map(card => (
          <button
            key={card.key}
            onClick={() => setExpanded(expanded === card.key ? null : card.key)}
            className="rounded-[20px] p-5 flex items-center gap-4 text-left transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: card.gradient, boxShadow: expanded === card.key ? `0 8px 28px ${card.glow}` : `0 4px 16px ${card.glow}`, outline: expanded === card.key ? '2px solid rgba(255,255,255,0.4)' : 'none' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold">{card.label}</p>
              <p className="text-white font-extrabold text-3xl leading-none mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{card.count}</p>
              <p className="text-white/70 text-[10px] mt-1">{expanded === card.key ? 'Click to collapse' : 'Click to view'}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Expanded employee list ── */}
      {expanded && (() => {
        const active = cards.find(c => c.key === expanded)!
        return (
          <div className="px-6 pb-6">
            <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid var(--c-border3)' }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--c-surface)', borderBottom: '1px solid var(--c-border3)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--c-t1)' }}>{active.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: active.gradient }}>{active.count}</span>
              </div>
              {active.list.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs" style={{ color: 'var(--c-t3)' }}>No employees in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 p-2">
                  {active.list.map(emp => {
                    const s = ATT_STATUS_CFG[emp.status] || ATT_STATUS_CFG.not_checked_in
                    return (
                      <button
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left hover:opacity-80"
                        style={{ backgroundColor: s.bg }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{emp.full_name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{emp.emp_code}</p>
                        </div>
                        {emp.punch_in && (
                          <p className="text-[9px] font-mono shrink-0" style={{ color: 'var(--c-t3)' }}>{formatTime(emp.punch_in)}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { employee } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isHrOrAdmin = employee?.role === 'hr_admin' || employee?.role === 'super_admin'
  const isManagerOrHr = isHrOrAdmin || employee?.role === 'manager'

  const [punchLoading, setPunchLoading] = useState(false)
  const [ghibliTs, setGhibliTs] = useState(0)

  const greeting = getGreeting()

  const { data: todayAttn, refetch: refetchToday } = useQuery({ queryKey: ['attendance-today'], queryFn: () => attendanceApi.today() })
  const { data: myBalance } = useQuery({ queryKey: ['leave-balance'], queryFn: () => leavesApi.myBalance() })
  const { data: teamLeaves } = useQuery({ queryKey: ['team-leaves-pending'], queryFn: () => leavesApi.teamLeaves({ status: 'pending', per_page: 5 }), enabled: isManagerOrHr })
  const { data: orgData } = useQuery({ queryKey: ['employees-org-chart'], queryFn: () => employeesApi.orgChart() })
  const { data: profileData } = useQuery({ queryKey: ['my-profile-dash', ghibliTs], queryFn: () => profileApi.getMe(), enabled: !!employee })
  const now = new Date()
  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', employee?.id, now.getMonth() + 1, now.getFullYear()],
    queryFn: () => attendanceApi.summary(employee!.id, now.getMonth() + 1, now.getFullYear()),
    enabled: !!employee,
  })
  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => notificationsApi.list({ per_page: 50 }),
    enabled: !!employee,
  })
  const { data: employeesTodayData } = useQuery({
    queryKey: ['employees-today-status'],
    queryFn: () => attendanceApi.todayAll(),
    enabled: isHrOrAdmin,
    refetchInterval: 60000,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leavesApi.action(id, action),
    onSuccess: (_, { action }) => { toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`); qc.invalidateQueries({ queryKey: ['team-leaves-pending'] }) },
    onError: () => toast.error('Action failed'),
  })

  const today = todayAttn?.data?.data
  const pending = teamLeaves?.data?.data ?? []
  const summary = summaryData?.data?.data
  const allNotifs = notificationsData?.data?.data?.notifications ?? []
  const announcements = allNotifs.filter((n: any) => n.type === 'announcement')

  const todayCelebration = allNotifs.find(
    (n: any) => (n.type === 'birthday' || n.type === 'work_anniversary') &&
    new Date(n.created_at).toDateString() === new Date().toDateString()
  )

  const attendancePct  = summary?.attendance_percentage ?? 0
  const orgEmployees   = orgData?.data?.data ?? []
  const employeesToday = employeesTodayData?.data?.data ?? []
  const myProfile      = profileData?.data?.data
  const ghibliImageUrl = resolveAvatarUrl(myProfile?.profile?.ghibli_image_url, ghibliTs || undefined)
  const canPunchIn  = !today
  const canPunchOut = today && !today.punch_out
  const monthDays   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayNumber   = now.getDate()
  const monthRoadPct = Math.max(0, Math.min(100, Math.round((dayNumber / monthDays) * 100)))
  const leaveBalance = (myBalance?.data?.data ?? []).find((b: any) => b.leave_type?.code === 'EL' || b.leave_type?.code === 'PL')
  const leaveLeft = leaveBalance ? leaveBalance.available : null

  const perfScore = Math.round(attendancePct * 0.85 + 15)
  const perfLabel = getPerfLabel(attendancePct)

  const handlePunch = async () => {
    setPunchLoading(true)
    try {
      const loc = await getLocation()
      const lat = loc?.latitude ?? 0; const lng = loc?.longitude ?? 0
      if (canPunchIn)  { await attendanceApi.punchIn(lat, lng);  toast.success('Punched in! Have a great day') }
      else if (canPunchOut) { await attendanceApi.punchOut(lat, lng); toast.success('Day wrapped! See you tomorrow') }
      refetchToday()
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Punch failed') }
    finally { setPunchLoading(false) }
  }

  const handleGhibliUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
    try {
      await profileApi.uploadGhibliImage(file)
      setGhibliTs(Date.now())
      qc.invalidateQueries({ queryKey: ['my-profile-dash'] })
      toast.success('Photo uploaded!')
    } catch { toast.error('Upload failed') }
  }

  const celebrationConfig = todayCelebration?.type === 'birthday'
    ? { emoji: '🎂', gradient: 'linear-gradient(135deg,#BE185D,#EC4899)', glow: 'rgba(236,72,153,0.18)' }
    : { emoji: '🎉', gradient: 'linear-gradient(135deg,#EA580C,#F97316)', glow: 'rgba(249,115,22,0.18)' }

  return (
    <div className="space-y-5">

      {/* ══ Celebration Banner ══ */}
      {todayCelebration && (
        <div
          className="rounded-[20px] px-6 py-5 flex items-center gap-5 relative overflow-hidden"
          style={{ background: celebrationConfig.gradient, boxShadow: `0 8px 32px ${celebrationConfig.glow}` }}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-20 pointer-events-none"
              style={{ width: 60 + i * 30, height: 60 + i * 30, background: '#fff', top: -20 - i * 10, right: 40 + i * 60 }} />
          ))}
          <span className="text-4xl shrink-0 relative z-10">{celebrationConfig.emoji}</span>
          <div className="relative z-10">
            <p className="text-white font-extrabold text-lg leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {todayCelebration.title}
            </p>
            <p className="text-white/80 text-sm mt-1">{todayCelebration.body}</p>
          </div>
        </div>
      )}

      {/* ══ ROW 1: Greeting + Stats ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ── Greeting Card (spans 3 cols) ── */}
        <div
          className="xl:col-span-3 rounded-[28px] p-7 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FFEADF 0%, #FFD6C8 50%, #FFF5F0 100%)',
            boxShadow: '0 8px 32px rgba(249,115,22,0.12)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-20 pointer-events-none" style={{ background: '#F97316' }} />
          <div className="absolute top-6 -right-4 w-28 h-28 rounded-full opacity-10 pointer-events-none" style={{ background: '#EA580C' }} />

          <div className="relative z-10 flex items-center justify-between gap-4 h-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#F97316', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {greeting.emoji} {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-3" style={{ color: '#1A1A2E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {greeting.text},<br />{employee?.first_name}!
              </h1>
              <p className="text-sm mb-5" style={{ color: '#6B7280', maxWidth: 300 }}>
                {summary
                  ? `You've been present ${summary.present} out of ${summary.present + summary.absent + summary.late} working days this month.`
                  : 'Track your attendance, leaves and performance all in one place.'
                }
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {!isManagerOrHr && (
                  <>
                    <button
                      onClick={handlePunch}
                      disabled={punchLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', boxShadow: '0 4px 16px rgba(249,115,22,0.30)' }}
                    >
                      {punchLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{canPunchIn ? 'login' : 'logout'}</span>
                      }
                      {canPunchIn ? 'Punch In' : 'Punch Out'}
                    </button>
                    <button
                      onClick={() => navigate('/attendance')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#374151', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(249,115,22,0.2)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>beach_access</span>
                      Request Leave
                    </button>
                  </>
                )}
                {isManagerOrHr && (
                  <button
                    onClick={() => navigate('/attendance')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff', boxShadow: '0 4px 16px rgba(249,115,22,0.25)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>manage_accounts</span>
                    Manage Team
                  </button>
                )}
              </div>
            </div>

            {/* Avatar */}
            <div className="shrink-0 hidden sm:flex items-center justify-center">
              <AdjustableImageUpload
                currentUrl={ghibliImageUrl}
                alt={`${employee?.first_name || 'Your'} avatar`}
                frameSize={160}
                caption="My Avatar"
                title="Update avatar"
                description="Adjust and upload your avatar image."
                confirmLabel="Save"
                onUpload={async (file) => {
                  if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
                  try {
                    await profileApi.uploadGhibliImage(file)
                    setGhibliTs(Date.now())
                    qc.invalidateQueries({ queryKey: ['my-profile-dash'] })
                    toast.success('Photo updated!')
                  } catch { toast.error('Upload failed') }
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Stat Cards (spans 2 cols) ── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Attendance */}
          <div
            className="flex-1 rounded-[20px] p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', boxShadow: '0 6px 20px rgba(59,130,246,0.25)' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold">Attendance</p>
              <p className="text-white font-extrabold text-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {summary ? `${attendancePct.toFixed(0)}%` : '--'}
              </p>
              <p className="text-white/70 text-[11px] mt-0.5">
                {summary ? `${summary.present}/${summary.present + summary.absent + summary.late} days` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Leave Balance */}
          <div
            className="flex-1 rounded-[20px] p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#B45309,#D97706)', boxShadow: '0 6px 20px rgba(217,119,6,0.25)' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>beach_access</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold">Leave Balance</p>
              <p className="text-white font-extrabold text-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {leaveLeft !== null ? `${leaveLeft}d` : '--'}
              </p>
              <p className="text-white/70 text-[11px] mt-0.5">Earned leave remaining</p>
            </div>
          </div>

          {/* Performance */}
          <div
            className="flex-1 rounded-[20px] p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', boxShadow: '0 6px 20px rgba(249,115,22,0.25)' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold">Performance</p>
              <p className="text-white font-extrabold text-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {summary ? `${perfScore}/100` : '--'}
              </p>
              <p className="text-white/70 text-[11px] mt-0.5">{summary ? perfLabel : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ROW 2: Road to Goal + Attendance Stats + Announcements ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Road to Goal */}
        <div
          className="xl:col-span-2 rounded-[24px] p-6"
          style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 4px 24px rgba(249,115,22,0.06)', border: '1px solid var(--c-border2)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
              Road to Goal
            </h3>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-black"
                style={{ color: '#F97316', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {monthRoadPct}%
              </span>
              <span className="text-xs" style={{ color: 'var(--c-t3)' }}>Day {dayNumber}/{monthDays}</span>
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--c-t3)' }}>Monthly progress based on attendance</p>

          <RoadToGoalChart currentPct={attendancePct} />

          {/* Summary row */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--c-border3)' }}>
              {[
                { label: 'Present', val: summary.present, color: '#22C55E' },
                { label: 'Late',    val: summary.late,    color: '#EAB308' },
                { label: 'Absent',  val: summary.absent,  color: '#EF4444' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--c-t3)' }}>{s.label}</p>
                  <p className="text-xl font-extrabold" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div
          className="xl:col-span-1 rounded-[24px] p-6"
          style={{ backgroundColor: 'var(--c-card)', boxShadow: '0 4px 24px rgba(249,115,22,0.06)', border: '1px solid var(--c-border2)' }}
        >
          <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            Announcements
          </h3>

          <div className="space-y-3">
            {today?.punch_in && (
              <div className="flex gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'rgba(34,197,94,0.07)' }}>
                <span className="material-symbols-outlined mt-0.5 shrink-0" style={{ fontSize: '18px', color: '#22C55E' }}>check_circle</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--c-t1)' }}>Shift Started</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>
                    Punched in at <span className="font-semibold">{formatTime(today.punch_in)}</span>
                  </p>
                </div>
              </div>
            )}

            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((ann: any, idx: number) => {
                const isBirthday = ann.reference_type === 'birthday_broadcast'
                const isAnniv    = ann.reference_type === 'anniversary_broadcast'
                const icon = isBirthday ? '🎂' : isAnniv ? '🎉' : null
                return (
                  <div key={ann.id} className="flex gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--c-surface)' }}>
                    {icon
                      ? <span className="text-lg mt-0.5 shrink-0">{icon}</span>
                      : <span className="material-symbols-outlined mt-0.5 shrink-0" style={{ fontSize: '18px', color: '#F97316' }}>campaign</span>
                    }
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--c-t1)' }}>{ann.title}</p>
                      <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--c-t3)' }}>{ann.body}</p>
                      <p className="text-[9px] mt-1 font-semibold" style={{ color: '#F97316' }}>{formatDate(ann.created_at)}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--c-surface)' }}>
                <span className="material-symbols-outlined mt-0.5" style={{ fontSize: '18px', color: '#F97316' }}>info</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>No new announcements right now.</p>
              </div>
            )}
          </div>

          {/* Pending Approvals (managers) */}
          {isManagerOrHr && pending.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--c-border3)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--c-t1)' }}>Pending Approvals ({pending.length})</p>
              <div className="space-y-2">
                {pending.slice(0, 3).map((req: LeaveRequest) => (
                  <div key={req.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl" style={{ backgroundColor: 'var(--c-surface)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{(req as any).employee?.full_name ?? 'Employee'}</p>
                      <p className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{req.leave_type?.name} · {req.days}d</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => actionMutation.mutate({ id: req.id, action: 'approve' })}
                        disabled={actionMutation.isPending}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                      </button>
                      <button
                        onClick={() => actionMutation.mutate({ id: req.id, action: 'reject' })}
                        disabled={actionMutation.isPending}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ ROW 3: Org Chart ══ */}
      {orgEmployees.length > 0 && (
        <OrgChartSection employees={orgEmployees} currentEmployeeId={employee?.id} />
      )}

      {/* ══ ROW 4: Employee Today Status (HR/Admin) ══ */}
      {isHrOrAdmin && employeesToday.length > 0 && (
        <AttendanceTodayWidget employeesToday={employeesToday} navigate={navigate} />
      )}

    </div>
  )
}
