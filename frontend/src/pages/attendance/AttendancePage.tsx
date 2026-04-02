import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, MapPin, Clock, PlayCircle, StopCircle, CheckCircle2, CalendarDays, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { attendanceApi } from '@/api/attendance'
import { formatMinutes, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import type { AttendanceLog } from '@/types'
import { LeavesPanel } from '@/pages/leaves/LeavesPage'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Enhanced Status Theme
const statusConfig: Record<string, { bg: string; color: string; iconColor: string }> = {
  present: { bg: 'bg-emerald-50', color: 'text-emerald-700', iconColor: '#10B981' },
  late: { bg: 'bg-amber-50', color: 'text-amber-700', iconColor: '#F59E0B' },
  absent: { bg: 'bg-red-50', color: 'text-red-700', iconColor: '#EF4444' },
  half_day: { bg: 'bg-orange-50', color: 'text-orange-700', iconColor: '#F97316' },
  on_leave: { bg: 'bg-blue-50', color: 'text-blue-700', iconColor: '#3B82F6' },
  week_off: { bg: 'bg-slate-50', color: 'text-slate-500', iconColor: '#94A3B8' },
  holiday: { bg: 'bg-indigo-50', color: 'text-indigo-700', iconColor: '#6366F1' },
  wfh: { bg: 'bg-violet-50', color: 'text-violet-700', iconColor: '#8B5CF6' },
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    )
  })
}

export function AttendancePage() {
  const { employee } = useAuthStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [punchLoading, setPunchLoading] = useState(false)
  const [isWfh, setIsWfh] = useState(false)

  const goBack = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goForward = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['attendance-summary', employee?.id, month, year],
    queryFn: () => attendanceApi.summary(employee!.id, month, year),
    enabled: !!employee,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['attendance-logs', month, year],
    queryFn: () => attendanceApi.my({ month, year, per_page: 31 }),
    enabled: !!employee,
  })

  const { data: todayAttn, refetch: refetchToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceApi.today(),
  })

  const today = todayAttn?.data?.data
  const summary = summaryData?.data?.data
  const logs: AttendanceLog[] = logsData?.data?.data ?? []
  const canPunchIn = !today
  const canPunchOut = !!today && !today.punch_out
  const hasPunchedOut = !!today?.punch_out

  const handlePunch = async () => {
    setPunchLoading(true)
    try {
      let lat = 0
      let lng = 0

      if (!isWfh) {
        const loc = await getLocation()
        if (!loc) {
          toast.error('Location access is required. Please enable location permissions or mark as WFH.')
          return
        }
        lat = loc.latitude
        lng = loc.longitude
      }

      if (canPunchIn) {
        await attendanceApi.punchIn(lat, lng, isWfh)
        toast.success(isWfh ? 'WFH Session Initiated!' : 'Punched in successfully!')
      } else if (canPunchOut) {
        await attendanceApi.punchOut(lat, lng)
        toast.success('Punched out successfully!')
      }

      refetchToday()
      refetchSummary()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Synchronization failed')
    } finally {
      setPunchLoading(false)
    }
  }

  const logMap: Record<number, string> = {}
  logs.forEach((log) => {
    logMap[new Date(log.date).getDate()] = log.status
  })

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
  const todayDate = isCurrentMonth ? now.getDate() : -1
  const cells = buildCalendarCells(year, month)
  const attendancePct = summary?.attendance_percentage ?? 0
  const presentCount = (summary?.present ?? 0) + (summary?.late ?? 0)
  const flowScore = Math.min(100, Math.round(attendancePct * 1.1))

  return (
    <div className="space-y-6 md:space-y-10 pb-10 page-enter">
      {/* ── Dynamic Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <Activity className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">Attendance Console</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>
            {getGreeting()}, <span className="text-blue-600">{employee?.first_name}</span>
          </h1>
          <p className="text-sm font-medium opacity-60" style={{ color: 'var(--c-t2)' }}>
            Maintain your professional cadence and track operational cycles.
          </p>
        </div>

        <div className="card-kinetic px-8 py-4 flex items-center gap-5 border border-white bg-white/40 backdrop-blur-xl shadow-xl shadow-blue-500/5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: 'var(--c-t1)' }}>System Time</p>
            <p className="text-2xl font-black tracking-tighter" style={{ color: 'var(--c-t1)' }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* ── Pulse Control ── */}
        <div className="card-kinetic p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-6 opacity-40" style={{ color: 'var(--c-t1)' }}>Operational Switch</p>

          {!today && (
            <button
              onClick={() => setIsWfh(!isWfh)}
              className={cn(
                "mb-8 flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-300",
                isWfh 
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-200" 
                  : "bg-white border-slate-100 text-slate-500 hover:border-blue-200"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                isWfh ? "border-white bg-white" : "border-slate-300 bg-transparent"
              )}>
                {isWfh && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Work From Home</span>
            </button>
          )}

          <button
            onClick={handlePunch}
            disabled={punchLoading || hasPunchedOut}
            className={cn(
              'relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 mb-10',
              hasPunchedOut ? 'grayscale opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 group-hover:shadow-[0_0_50px_rgba(37,99,235,0.2)]',
            )}
            style={{
              background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
              boxShadow: hasPunchedOut ? 'none' : '0px 20px 40px rgba(37,99,235,0.3)',
            }}
          >
            {punchLoading ? (
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            ) : (
              <>
                <div className="mb-2 transition-transform duration-500 group-hover:scale-110">
                  {hasPunchedOut ? <CheckCircle2 className="w-12 h-12 text-white" /> : canPunchIn ? <PlayCircle className="w-12 h-12 text-white" /> : <StopCircle className="w-12 h-12 text-white" />}
                </div>
                <span className="text-white text-[11px] font-black uppercase tracking-[0.2em]">
                  {hasPunchedOut ? 'COMPLETED' : canPunchIn ? 'INITIATE' : 'TERMINATE'}
                </span>
                {!hasPunchedOut && !canPunchIn && (
                  <span className="absolute -bottom-2 px-3 py-1 rounded-full bg-white text-blue-600 text-[10px] font-black shadow-lg">ACTIVE</span>
                )}
              </>
            )}
          </button>

          {today ? (
            <div className="space-y-3 w-full max-w-xs">
              {today.punch_in && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-800/60">Activation</span>
                  <span className="font-black text-blue-700">{formatTime(today.punch_in)}</span>
                </div>
              )}
              {today.punch_out && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800/60">Release</span>
                  <span className="font-black text-emerald-700">{formatTime(today.punch_out)}</span>
                </div>
              )}
              {today.working_minutes != null && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-100/50 border border-slate-200/50">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--c-t1)' }}>Duration</span>
                  <span className="font-black" style={{ color: 'var(--c-t1)' }}>{Math.floor(today.working_minutes / 60)}H {today.working_minutes % 60}M</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-100" style={{ borderColor: 'var(--c-border3)' }}>
              <p className="text-[10px] font-bold opacity-40" style={{ color: 'var(--c-t1)' }}>No active session identified</p>
            </div>
          )}
        </div>

        {/* ── Metrics Stack ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
          <div className="card-kinetic p-6 flex flex-col justify-between group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4" style={{ color: 'var(--c-t1)' }}>Attendance Yield</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter text-blue-600 group-hover:scale-110 transition-transform origin-left inline-block">{Math.round(attendancePct)}</span>
                <span className="text-lg font-black text-blue-400/60">%</span>
              </div>
            </div>
            <div className="h-2 rounded-full mt-6 bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${attendancePct}%` }} />
            </div>
          </div>

          <div className="card-kinetic p-6 group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4" style={{ color: 'var(--c-t1)' }}>Session Streak</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black tracking-tighter text-indigo-600">{presentCount}</span>
              <span className="text-xs font-bold opacity-40 uppercase tracking-widest" style={{ color: 'var(--c-t1)' }}>Cycles This Month</span>
            </div>
          </div>

          <div className="card-kinetic p-6 group relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4" style={{ color: 'var(--c-t1)' }}>Operational Score</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black tracking-tighter text-emerald-600">{flowScore}</span>
              <span className="text-lg font-black text-emerald-400/60">/ 100</span>
            </div>
          </div>
        </div>

        {/* ── Chrono Vision (Calendar) ── */}
        <div className="card-kinetic p-6 md:p-8 flex flex-col border-2" style={{ borderColor: 'var(--c-border3)' }}>
          <div className="flex items-center justify-between mb-8">
            <button onClick={goBack} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.3em] block opacity-30 mb-1" style={{ color: 'var(--c-t1)' }}>Temporal View</span>
              <span className="text-lg font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>
                {MONTH_NAMES[month - 1]} <span className="text-blue-600">{year}</span>
              </span>
            </div>
            <button onClick={goForward} disabled={isCurrentMonth} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-slate-100 disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-current">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {DOW.map((d) => (
              <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest opacity-30" style={{ color: 'var(--c-t1)' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3 flex-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />
              const status = logMap[day]
              const isToday = day === todayDate
              const config = status ? statusConfig[status] : null
              
              return (
                <div key={day} className="flex flex-col items-center group cursor-default">
                  <div
                    className={cn(
                      "w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-2xl text-xs font-black transition-all duration-300 border",
                      isToday ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200 scale-110 z-10" : "bg-white border-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
                    )}
                  >
                    {day}
                  </div>
                  {config && !isToday && (
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.iconColor }}></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Log Manifest ── */}
      <div className="card-kinetic overflow-hidden border" style={{ borderColor: 'var(--c-border3)' }}>
        <div className="px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b bg-slate-50/30" style={{ borderColor: 'var(--c-border3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>Cycle Manifest</h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm text-blue-600">
            {logs.length} ENTRIES
          </span>
        </div>

        {logsLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-[1.5rem]" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-sm font-bold opacity-30 uppercase tracking-[0.2em]" style={{ color: 'var(--c-t1)' }}>No operational logs identified</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full space-y-0.5 p-1">
              {logs.map((log) => {
                const dateObj = new Date(log.date)
                const day = dateObj.getDate()
                const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()
                const config = statusConfig[log.status] || statusConfig.week_off
                
                return (
                  <div 
                    key={log.id} 
                    className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 px-6 md:px-8 py-5 hover:bg-blue-50/30 transition-all duration-300 rounded-[1.5rem]"
                  >
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                      <div className="text-center w-12 shrink-0">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-0.5" style={{ color: 'var(--c-t1)' }}>{dayName}</p>
                        <p className="text-2xl font-black tracking-tighter" style={{ color: 'var(--c-t1)' }}>{day}</p>
                      </div>
                      <div className="block sm:hidden flex-1">
                        <span className={cn("inline-block text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest", config.bg, config.color)}>
                          {(log.status || '').replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="hidden sm:inline-block mb-1.5">
                        <span className={cn("text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest", config.bg, config.color)}>
                          {(log.status || '').replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold opacity-60" style={{ color: 'var(--c-t1)' }}>
                        {log.punch_in ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                              <span>{formatTime(log.punch_in)}</span>
                            </div>
                            {log.punch_out && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                                <span>{formatTime(log.punch_out)}</span>
                              </div>
                            )}
                            {log.working_minutes && (
                              <div className="hidden md:flex items-center gap-1.5 px-3 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                                <span>{formatMinutes(log.working_minutes)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="italic opacity-40">No activity recorded</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto flex justify-end">
                      {log.late_minutes > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 leading-none">Latency</span>
                          <span className="text-sm font-black text-red-600">+{log.late_minutes}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-kinetic p-8 relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>Operational Coordinates</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{MONTH_NAMES[month - 1]} {year} · Punch Log</p>
            </div>
          </div>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--c-border3)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-30" style={{ color: 'var(--c-t1)' }}>No logs for this period</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-64 space-y-1.5 pr-1">
              {logs.filter(l => l.punch_in).map((log) => {
                const d = new Date(log.date)
                const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()
                const dayNum = d.getDate()
                const config = statusConfig[log.status] || statusConfig.week_off
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-blue-50/30 transition-colors">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-[9px] font-black uppercase opacity-40" style={{ color: 'var(--c-t1)' }}>{dayName}</p>
                      <p className="text-lg font-black leading-tight" style={{ color: 'var(--c-t1)' }}>{dayNum}</p>
                    </div>
                    <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0', config.bg, config.color)}>
                      {(log.status || '').replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-3 flex-1 text-xs font-bold min-w-0" style={{ color: 'var(--c-t2)' }}>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span>{formatTime(log.punch_in)}</span>
                      </div>
                      {log.punch_out && (
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span>{formatTime(log.punch_out)}</span>
                        </div>
                      )}
                      {log.working_minutes ? (
                        <span className="text-[10px] opacity-50 ml-auto shrink-0">{Math.floor(log.working_minutes / 60)}h {log.working_minutes % 60}m</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <LeavesPanel embedded />
      </div>
    </div>
  )
}
