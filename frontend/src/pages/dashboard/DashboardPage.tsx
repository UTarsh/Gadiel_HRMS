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
import { useState, useRef, useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { AdjustableImageUpload } from '@/components/shared/AdjustableImageUpload'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return { text: 'Late-night focus', emoji: '🌙' }
  if (h < 12) return { text: 'Fresh morning start', emoji: '☀️' }
  if (h < 17) return { text: 'Powering through the day', emoji: '🚀' }
  if (h < 21) return { text: 'Evening momentum', emoji: '✨' }
  return { text: 'Night shift energy', emoji: '🌟' }
}

function getThoughtfulWelcomeLine() {
  const h = new Date().getHours()
  if (h < 5) return 'Welcome to HRMS. Quiet hours, clear focus, strong output. 🌙'
  if (h < 12) return 'Welcome to HRMS. One steady step now saves ten later. ☀️'
  if (h < 17) return 'Welcome to HRMS. Keep the flow going, your consistency compounds. 🚀'
  if (h < 21) return 'Welcome to HRMS. Wrap up with intention and leave no loose ends. ✨'
  return 'Welcome to HRMS. Calm mind, sharp execution, great outcomes. 🌟'
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

// ─── Org Tree ─────────────────────────────────────────────────────────────────

function getConnectorStyle(isFirst: boolean, isLast: boolean, isSingle: boolean): React.CSSProperties {
  const color = '#60A5FA'
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
    0: { background: '#1D4ED8', color: '#fff', boxShadow: '0 8px 24px rgba(29,78,216,0.35)' },
    1: {
      background: isDark ? '#0F2040' : 'var(--c-card)',
      color: isDark ? '#E2E8F0' : '#1E293B',
      border: `1.5px solid ${isDark ? '#1E3A5F' : '#2563EB'}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
    },
    2: {
      background: isDark ? '#0A1830' : 'var(--c-card)',
      color: isDark ? '#94A3B8' : '#1E293B',
      border: `1.5px solid ${isDark ? '#142040' : '#93C5FD'}`,
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
              style={{ background: depth === 0 ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff' }}
            >
              {getInitials(emp.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className={`font-bold leading-tight break-words ${isDeep ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: depth === 0 ? '#fff' : (isDark ? '#E2E8F0' : '#1E3A5F'), fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {emp.full_name}
            </p>
            <p className={`break-words ${isDeep ? 'text-[9px]' : 'text-[10px]'} mt-0.5`}
              style={{ color: depth === 0 ? 'rgba(255,255,255,0.75)' : (isDark ? '#64748B' : '#64748B') }}>
              {emp.designation?.name || (emp.role || 'Employee').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </button>

      {children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 20, backgroundColor: '#60A5FA' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === children.length - 1
              const isSingle = children.length === 1
              return (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', ...getConnectorStyle(isFirst, isLast, isSingle) }} />
                  <div style={{ width: 2, height: 20, backgroundColor: isSingle ? 'transparent' : '#60A5FA' }} />
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
    <div className="rounded-[24px] overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
      <div className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border3)' }}>
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--c-surface)', color: '#1D4ED8' }}>🏢</span>
            Organization Chart
          </h3>
          <p className="text-xs mt-1 ml-10" style={{ color: 'var(--c-t3)' }}>
            {employees.length} people · complete company hierarchy
          </p>
        </div>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--c-surface)', color: '#2563EB' }}
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

// ─── Ghibli Frame Card ────────────────────────────────────────────────────────

function GhibliFrameCard({ imageUrl, onUpload, uploading }: { imageUrl: string | null; onUpload: (f: File) => void; uploading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative flex flex-col items-center justify-center gap-3">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />

      {imageUrl ? (
        <div className="relative group">
          <div className="relative rounded-[20px] overflow-hidden shadow-sm" style={{ width: 140, height: 140, border: '1px solid var(--c-border2)' }}>
            <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-slate-900/40 backdrop-blur-sm">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>photo_camera</span>
            <span className="text-white text-[10px] font-bold mt-1">Change</span>
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="relative rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all group"
          style={{ width: 140, height: 140, backgroundColor: 'var(--c-surface)', border: '2px dashed var(--c-border2)' }}>
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : (
            <>
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cloud_upload</span>
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--c-t2)' }}>Upload Photo</p>
              <p className="text-[9px] px-2 leading-tight text-center" style={{ color: 'var(--c-t3)' }}>Ghibli character or anything fun</p>
            </>
          )}
        </button>
      )}
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
  const [ghibliUploading, setGhibliUploading] = useState(false)

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

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leavesApi.action(id, action),
    onSuccess: (_, { action }) => { toast.success(`Leave ${action === 'approve' ? 'approved ✅' : 'rejected'}`); qc.invalidateQueries({ queryKey: ['team-leaves-pending'] }) },
    onError: () => toast.error('Action failed'),
  })

  const today = todayAttn?.data?.data
  const pending = teamLeaves?.data?.data ?? []
  const summary = summaryData?.data?.data
  const allNotifs = notificationsData?.data?.data?.notifications ?? []
  const announcements = allNotifs.filter((n: any) => n.type === 'announcement')

  // Personal celebration for the logged-in user today
  const todayCelebration = allNotifs.find(
    (n: any) => (n.type === 'birthday' || n.type === 'work_anniversary') &&
    new Date(n.created_at).toDateString() === new Date().toDateString()
  )
  const attendancePct = summary?.attendance_percentage ?? 0
  const orgEmployees = orgData?.data?.data ?? []
  const myProfile = profileData?.data?.data
  const ghibliImageUrl = resolveAvatarUrl(myProfile?.profile?.ghibli_image_url, ghibliTs || undefined)
  const canPunchIn = !today
  const canPunchOut = today && !today.punch_out
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayNumber = now.getDate()
  const monthRoadPct = Math.max(0, Math.min(100, (dayNumber / Math.max(monthDays, 1)) * 100))

  const handlePunch = async () => {
    setPunchLoading(true)
    try {
      const loc = await getLocation()
      const lat = loc?.latitude ?? 0; const lng = loc?.longitude ?? 0
      if (canPunchIn) { await attendanceApi.punchIn(lat, lng); toast.success('Punched in! Have a great day 🎉') }
      else if (canPunchOut) { await attendanceApi.punchOut(lat, lng); toast.success('Day wrapped! See you tomorrow 👋') }
      refetchToday()
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Punch failed') }
    finally { setPunchLoading(false) }
  }

  const handleGhibliUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
    setGhibliUploading(true)
    try {
      await profileApi.uploadGhibliImage(file)
      setGhibliTs(Date.now())
      qc.invalidateQueries({ queryKey: ['my-profile-dash'] })
      toast.success('Photo uploaded! 🌸')
    } catch { toast.error('Upload failed') }
    finally { setGhibliUploading(false) }
  }

  const celebrationConfig = todayCelebration?.type === 'birthday'
    ? { emoji: '🎂', gradient: 'linear-gradient(135deg,#be185d,#ec4899)', glow: 'rgba(236,72,153,0.18)' }
    : { emoji: '🎉', gradient: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', glow: 'rgba(124,58,237,0.18)' }

  return (
    <div className="space-y-6">

      {/* ══ Celebration Banner ══ */}
      {todayCelebration && (
        <div
          className="rounded-[20px] px-6 py-5 flex items-center gap-5 shadow-md relative overflow-hidden"
          style={{ background: celebrationConfig.gradient, boxShadow: `0 8px 32px ${celebrationConfig.glow}` }}
        >
          {/* Confetti-like dots */}
          {[...Array(6)].map((_, i) => (
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

      {/* ══ ROW 1: Hero & Stats ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Hero Card */}
        <div className="xl:col-span-2 rounded-[24px] p-8 relative overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 w-full h-full">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {greeting.text} {greeting.emoji}, {employee?.first_name}!
              </h1>
              <p className="mt-2 text-sm max-w-sm" style={{ color: 'var(--c-t3)' }}>
                {getThoughtfulWelcomeLine()}
              </p>
              <div className="mt-5 max-w-md">
                <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: 'var(--c-t2)' }}>
                  <span>Road to Goal</span>
                  <span>Day {dayNumber}/{monthDays}</span>
                </div>
                <div className="mt-2 relative h-3 rounded-full overflow-visible" style={{ backgroundColor: 'var(--c-surface)' }}>
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${monthRoadPct}%`, background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}
                  />
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-sm transition-all duration-700"
                    style={{ left: `calc(${Math.min(monthRoadPct, 92)}% - 8px)` }}
                  >
                    🏃
                  </span>
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-sm">🏆</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                {!isManagerOrHr && (
                  <>
                    <button onClick={() => navigate('/attendance')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 bg-blue-600 text-white shadow-sm hover:bg-blue-700">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>beach_access</span> Request Leave
                    </button>
                    <button onClick={handlePunch} disabled={punchLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 border shadow-sm"
                      style={{ borderColor: 'var(--c-border2)', color: 'var(--c-t1)', backgroundColor: 'var(--c-card)' }}>
                      {punchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{canPunchIn ? 'login' : 'logout'}</span>}
                      {canPunchIn ? 'Punch In' : 'Punch Out'}
                    </button>
                  </>
                )}
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-transparent"
                  style={{ color: 'var(--c-t2)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border2)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span> View Profile
                </button>
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-center mt-4 md:mt-0">
              <AdjustableImageUpload
                currentUrl={ghibliImageUrl}
                alt={`${employee?.first_name || 'Your'} dashboard image`}
                frameSize={232}
                caption="My Avatar"
                title="Update dashboard image"
                description="Adjust the crop before uploading. The saved image is reused in the organization chart."
                confirmLabel="Save Image"
                onUpload={handleGhibliUpload}
              />
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        {summary ? (
          <div className="xl:col-span-1 grid grid-cols-2 gap-4">
            {[
              { label: 'Present',  val: summary.present,  sub: `${attendancePct.toFixed(0)}% this month`, icon: 'groups' },
              { label: 'Absent',   val: summary.absent,   sub: 'Needs attention', icon: 'work_history' },
              { label: 'Late',     val: summary.late,     sub: 'Avg arrival', icon: 'payments' },
              { label: 'On Leave', val: summary.on_leave, sub: 'Approved log', icon: 'event' },
            ].map((s) => (
              <div key={s.label} className="rounded-[20px] p-5 flex flex-col justify-between shadow-sm transition-transform hover:-translate-y-1"
                style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--c-surface)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                  </div>
                  <p className="text-xs font-bold" style={{ color: 'var(--c-t2)' }}>{s.label}</p>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.val}</p>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-1 truncate">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="xl:col-span-1 grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-[20px] animate-pulse" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)', minHeight: '140px' }} />)}
          </div>
        )}
      </div>

      {/* ══ ROW 2: Attendance Overview & Announcements ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 rounded-[24px] p-8 shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
          <h3 className="text-base font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Monthly Attendance Overview</h3>
          {summary ? (
            <>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--c-t2)' }}>Progress</span>
                <span className="text-sm font-bold" style={{ color: 'var(--c-t1)' }}>{attendancePct.toFixed(0)}%</span>
              </div>
              <div className="h-4 rounded-full w-full flex overflow-hidden mb-8" style={{ backgroundColor: 'var(--c-surface)' }}>
                <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${attendancePct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                {[{ label: 'Present', val: summary.present }, { label: 'Absent', val: summary.absent }, { label: 'Late', val: summary.late }].map((s, i) => (
                  <div key={s.label} className="flex-1 text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--c-t3)' }}>{s.label}</p>
                    <p className="text-3xl font-extrabold mt-1" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.val}</p>
                    {i < 2 && <div className="hidden" />}
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-32 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--c-surface)' }} />}
        </div>

        <div className="xl:col-span-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
          <div className="rounded-[24px] p-6 shadow-sm" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Announcements</h3>
            {today?.punch_in && (
              <div className="flex gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--c-surface)' }}>
                <span className="material-symbols-outlined text-blue-500 mt-0.5" style={{ fontSize: '18px' }}>notifications_active</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--c-t1)' }}>Shift Started</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>Punched in at <span className="font-semibold">{formatTime(today.punch_in)}</span>.</p>
                </div>
              </div>
            )}
            
            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((ann: any, idx: number) => {
                const isBirthday = ann.reference_type === 'birthday_broadcast'
                const isAnniv = ann.reference_type === 'anniversary_broadcast'
                const icon = isBirthday ? '🎂' : isAnniv ? '🎉' : null
                return (
                  <div key={ann.id} className={`flex gap-3 p-3 rounded-lg ${idx > 0 ? 'mt-2' : ''}`}
                    style={{ backgroundColor: (isBirthday || isAnniv) ? 'rgba(59,130,246,0.06)' : undefined }}>
                    {icon
                      ? <span className="text-lg mt-0.5 shrink-0">{icon}</span>
                      : <span className="material-symbols-outlined text-blue-500 mt-0.5 shrink-0" style={{ fontSize: '18px' }}>campaign</span>
                    }
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--c-t1)' }}>{ann.title}</p>
                      <p className="text-[10px] mt-0.5 max-w-[200px] leading-relaxed" style={{ color: 'var(--c-t3)' }}>{ann.body}</p>
                      <p className="text-[9px] mt-1 font-semibold text-blue-600">{formatDate(ann.created_at)}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex gap-3 p-3 rounded-lg">
                <span className="material-symbols-outlined text-emerald-500 mt-0.5" style={{ fontSize: '18px' }}>info</span>
                <div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>No new announcements from management.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ROW 3: Full Org Chart ══ */}
      {orgEmployees.length > 0 && <OrgChartSection employees={orgEmployees} currentEmployeeId={employee?.id} />}

    </div>
  )
}
