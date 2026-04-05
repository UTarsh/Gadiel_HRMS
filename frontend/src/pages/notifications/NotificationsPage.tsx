import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { notificationsApi } from '@/api/notifications'
import { compensationApi } from '@/api/compensation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Notification } from '@/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const typeConfig: Record<string, { icon: string; bg: string; color: string }> = {
  leave_applied:      { icon: 'event',          bg: 'var(--c-surface)',      color: '#3B82F6' },
  leave_approved:     { icon: 'event_available', bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
  leave_rejected:     { icon: 'event_busy',      bg: 'rgba(186,26,26,0.08)',  color: '#ba1a1a' },
  attendance_marked:  { icon: 'schedule',        bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
  attendance_missing: { icon: 'warning',         bg: 'rgba(217,119,6,0.1)',   color: '#D97706' },
  task_assigned:      { icon: 'assignment_ind',  bg: 'rgba(139,92,246,0.1)',  color: '#8B5CF6' },
  task_updated:       { icon: 'update',          bg: 'rgba(139,92,246,0.1)',  color: '#8B5CF6' },
  announcement:       { icon: 'campaign',        bg: 'rgba(147,197,253,0.2)', color: '#3B82F6' },
  system:             { icon: 'smart_toy',       bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
}

const CHANNELS = [
  { key: 'all',         label: 'All Alerts',      icon: 'notifications' },
  { key: 'ai_messages', label: 'AI Messages & Comm', icon: 'smart_toy' },
  { key: 'work',        label: 'Work & Tasks',    icon: 'work' },
  { key: 'payroll',     label: 'Payroll',         icon: 'payments' },
]

export function NotificationsPage() {
  const qc = useQueryClient()
  const [activeChannel, setActiveChannel] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ per_page: 50 }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
      toast.success('All marked as read')
    },
  })

  const handleDownloadPayslip = async (e: React.MouseEvent, payslipId: string) => {
    e.stopPropagation()
    try {
      const res = await compensationApi.getPayslip(payslipId)
      const pdfUrl = res.data?.data?.pdf_url
      if (!pdfUrl) { toast.error('Payslip PDF not available'); return }
      const blobRes = await compensationApi.downloadPayslipFile(pdfUrl)
      const filename = pdfUrl.split('/').pop() || 'payslip'
      const blob = new Blob([blobRes.data], { type: filename.endsWith('.html') ? 'text/html' : 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download payslip')
    }
  }

  const notifications: Notification[] = data?.data?.data?.notifications ?? []
  const unread = data?.data?.data?.unread_count ?? 0
  
  // Apply filtering based on active channel
  const filteredNotifications = notifications.filter(n => {
    if (activeChannel === 'all') return true
    if (activeChannel === 'ai_messages') return n.type === 'system' || (n.type === 'announcement' && n.reference_type !== 'payslip')
    if (activeChannel === 'work') return n.type.startsWith('leave_') || n.type.startsWith('attendance_') || n.type.startsWith('task_')
    if (activeChannel === 'payroll') return n.reference_type === 'payslip' 
    return true
  })

  // Dynamic counts for highlight cards
  const actionsCount = notifications.filter((n) => ['leave_applied', 'attendance_missing'].includes(n.type)).length
  const aiMessageCount = notifications.filter((n) => n.type === 'system' || (n.type === 'announcement' && n.reference_type !== 'payslip')).length

  return (
    <div className="space-y-6 md:space-y-8 page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            What's <span className="italic" style={{ color: '#2563EB' }}>Popping</span>?
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-t3)' }}>
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || notifications.length === 0}
          className="flex items-center gap-2 h-11 px-6 rounded-full text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--c-surface)', color: '#2563EB' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>done_all</span>
          Mark All Read
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Unread',       value: unread,         icon: 'mark_email_unread', bg: 'var(--c-surface)',      color: '#3B82F6' },
          { label: 'Actions',      value: actionsCount,     icon: 'task_alt',          bg: 'rgba(37,99,235,0.08)',  color: '#2563EB' },
          { label: 'Messages & AI',value: aiMessageCount,   icon: 'smart_toy',         bg: 'rgba(245,158,11,0.08)', color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="card-kinetic p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
              <span className="material-symbols-outlined" style={{ color: s.color, fontSize: '22px' }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--c-t3)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Channels + Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Channels sidebar */}
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0">
          {CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.key)}
              className={cn(
                "flex items-center gap-3 px-5 lg:px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink",
                activeChannel === ch.key ? "text-white font-bold" : "hover:bg-blue-50/50"
              )}
              style={activeChannel === ch.key
                ? { background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', boxShadow: '0px 8px 24px rgba(59,130,246,0.15)' }
                : { color: 'var(--c-t2)' }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{ch.icon}</span>
              {ch.label}
            </button>
          ))}
        </div>

        {/* Right: Notification Feed */}
        <div className="lg:col-span-3 card-kinetic overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Notifications</h3>
              {unread > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white bg-red-600">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-colors active:scale-95"
                style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>done_all</span>
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined" style={{ color: 'var(--c-t4)', fontSize: '32px' }}>notifications_off</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--c-t3)' }}>
                {activeChannel === 'all' ? 'No notifications yet' : 'No notifications in this channel'}
              </p>
            </div>
          ) : (
            <div className="max-h-[550px] overflow-y-auto">
              {filteredNotifications.map((n, idx) => {
                const cfg = typeConfig[n.type] ?? typeConfig.system
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                    className="w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-blue-50/20"
                    style={{
                      borderTop: idx === 0 ? 'none' : '1px solid var(--c-border)',
                      backgroundColor: n.is_read ? 'transparent' : 'rgba(59,130,246,0.03)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                      <span className="material-symbols-outlined" style={{ color: cfg.color, fontSize: '20px' }}>{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-snug break-words" style={{ color: 'var(--c-t1)', fontWeight: n.is_read ? 500 : 800 }}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 bg-blue-600 ring-4 ring-blue-50" />}
                      </div>
                      {n.body && <p className="text-xs mt-1 leading-relaxed break-words" style={{ color: 'var(--c-t2)' }}>{n.body}</p>}
                      {n.reference_type === 'payslip' && n.reference_id && (
                        <div className="mt-4 mb-1">
                           <button 
                             onClick={(e) => handleDownloadPayslip(e, n.reference_id!)}
                             className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition-colors"
                           >
                             <span className="material-symbols-outlined font-normal" style={{ fontSize: '16px' }}>download</span>
                             Download Payslip
                           </button>
                        </div>
                      )}
                      <p className="text-[10px] mt-2 font-bold uppercase tracking-wider" style={{ color: 'var(--c-t4)' }}>{timeAgo(n.created_at)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
