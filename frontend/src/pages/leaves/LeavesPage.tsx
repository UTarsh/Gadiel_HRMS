import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { leavesApi } from '@/api/leaves'
import { capitalize, formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import type { LeaveRequest } from '@/types'

const statusStyle: Record<string, { bg: string; color: string }> = {
  approved: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  auto_approved: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  pending: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
  rejected: { bg: 'rgba(186,26,26,0.08)', color: '#ba1a1a' },
  cancelled: { bg: 'var(--c-surface)', color: 'var(--c-t3)' },
}

const leaveTypeIcons: Record<string, string> = {
  EL: 'card_giftcard',
  CL: 'celebration',
  SL: 'healing',
}

const leaveTypeColors: string[] = ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA']

interface LeavesPanelProps {
  embedded?: boolean
}

export function LeavesPanel({ embedded = false }: LeavesPanelProps) {
  const { employee } = useAuthStore()
  const qc = useQueryClient()
  const isManagerOrHr = employee?.role === 'hr_admin' || employee?.role === 'super_admin' || employee?.role === 'manager'

  const [applyOpen, setApplyOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [form, setForm] = useState({ leave_type_id: '', from_date: '', to_date: '', reason: '' })

  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => leavesApi.types() })
  const { data: balance, isLoading: balanceLoading } = useQuery({ queryKey: ['leave-balance'], queryFn: () => leavesApi.myBalance() })
  const { data: myLeaves, isLoading: myLoading } = useQuery({
    queryKey: ['my-leaves', 1],
    queryFn: () => leavesApi.myLeaves({ page: 1, per_page: 20 }),
  })
  const { data: teamLeaves } = useQuery({
    queryKey: ['team-leaves-pending'],
    queryFn: () => leavesApi.teamLeaves({ status: 'pending', page: 1, per_page: 10 }),
    enabled: isManagerOrHr,
  })

  const applyMutation = useMutation({
    mutationFn: () => leavesApi.apply({ ...form }),
    onSuccess: () => {
      toast.success('Leave application submitted')
      setApplyOpen(false)
      setForm({ leave_type_id: '', from_date: '', to_date: '', reason: '' })
      qc.invalidateQueries({ queryKey: ['my-leaves'] })
      qc.invalidateQueries({ queryKey: ['leave-balance'] })
      qc.invalidateQueries({ queryKey: ['team-leaves-pending'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to apply'),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      leavesApi.action(id, action, reason),
    onSuccess: (_, { action }) => {
      toast.success(`Leave ${action}d`)
      qc.invalidateQueries({ queryKey: ['team-leaves-pending'] })
      qc.invalidateQueries({ queryKey: ['my-leaves'] })
      setRejectId(null)
      setRejectReason('')
    },
    onError: () => toast.error('Action failed'),
  })

  const balances = balance?.data?.data ?? []
  const leaveTypes = types?.data?.data ?? []
  const myList: LeaveRequest[] = myLeaves?.data?.data ?? []
  const pendingList: LeaveRequest[] = teamLeaves?.data?.data ?? []
  const totalUsed = balances.reduce((sum, b) => sum + (Number(b.total_entitled) - Number(b.available)), 0)
  const totalEntitled = balances.reduce((sum, b) => sum + Number(b.total_entitled), 0)

  return (
    <div className={cn("page-enter", embedded ? 'space-y-6' : 'space-y-8')}>
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--c-t3)' }}>
            {embedded ? 'Leave Center' : 'Leave Desk'}
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            {embedded ? 'Leave Balance, Requests, Approvals' : <>Time for a <span className="italic" style={{ color: '#2563EB' }}>Break</span>?</>}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--c-t3)' }}>
            {embedded ? 'Apply, track, and approve leave without leaving attendance.' : 'Manage your leave requests and energy bank.'}
          </p>
        </div>
        <button
          onClick={() => setApplyOpen(true)}
          className="flex items-center gap-2 h-11 px-6 md:h-12 md:px-8 rounded-full text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 text-white whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', boxShadow: '0px 8px 24px rgba(37,99,235,0.2)' }}
        >
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {balanceLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.slice(0, 4).map((b, idx) => {
            const pct = Math.min(100, (Number(b.available) / Math.max(Number(b.total_entitled), 1)) * 100)
            const color = leaveTypeColors[idx % leaveTypeColors.length]
            const icon = leaveTypeIcons[b.leave_type.code] ?? 'event'
            return (
              <div key={b.id} className="card-kinetic p-6 flex flex-col items-center text-center" style={{ border: '1px solid var(--c-border3)' }}>
                <div className="relative w-20 h-20 mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke={`${color}15`} strokeWidth="8" />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke={color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${pct * 2.136} 213.6`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ color, fontSize: '24px' }}>{icon}</span>
                  </div>
                </div>
                <p className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color }}>{Number(b.available).toFixed(0)}</p>
                <p className="text-xs mt-0.5 break-words max-w-full" style={{ color: 'var(--c-t3)' }}>
                  of {Number(b.total_entitled).toFixed(0)} {b.leave_type.code === 'EL' ? 'Earned' : b.leave_type.code === 'CL' ? 'Casual' : b.leave_type.code === 'SL' ? 'Sick' : b.leave_type.name}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border3)' }}>
          <p className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>{totalUsed.toFixed(0)}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-t3)' }}>Leaves Taken</p>
        </div>
        <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border3)' }}>
          <p className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#3B82F6' }}>{totalEntitled.toFixed(0)}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-t3)' }}>Total Entitled</p>
        </div>
        <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border3)' }}>
          <p className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2563EB' }}>{pendingList.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-t3)' }}>Pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-kinetic overflow-hidden flex flex-col h-full" style={{ border: '1px solid var(--c-border3)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Leave Requests</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}>My Leaves</span>
          </div>
          {myLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
          ) : myList.length === 0 ? (
            <div className="py-16 text-center flex-1">
              <span className="material-symbols-outlined mb-2 block" style={{ color: 'var(--c-t4)', fontSize: '32px' }}>beach_access</span>
              <p className="text-xs" style={{ color: 'var(--c-t3)' }}>No leave requests yet.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {myList.map((lr, idx) => {
                const badge = statusStyle[lr.status] ?? { bg: 'var(--c-surface)', color: 'var(--c-t3)' }
                const icon = leaveTypeIcons[lr.leave_type.code] ?? 'event'
                const color = leaveTypeColors[idx % leaveTypeColors.length]
                return (
                  <div key={lr.id} className="flex items-center gap-4 px-5 py-4 transition-colors" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--c-border)' }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <span className="material-symbols-outlined" style={{ color, fontSize: '20px' }}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold break-words" style={{ color: 'var(--c-t1)' }}>{lr.leave_type.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--c-t3)' }}>{formatDate(lr.from_date)} - {formatDate(lr.to_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold" style={{ color: 'var(--c-t2)' }}>{lr.days}d</span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {capitalize(lr.status.replace('_', ' '))}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card-kinetic overflow-hidden flex flex-col h-full" style={{ border: '1px solid var(--c-border3)' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Pending Approvals</h3>
            {pendingList.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>{pendingList.length}</span>
            )}
          </div>
          {pendingList.length === 0 ? (
            <div className="py-16 text-center flex-1">
              <span className="material-symbols-outlined mb-2 block" style={{ color: '#2563EB', fontSize: '32px' }}>check_circle</span>
              <p className="text-xs" style={{ color: 'var(--c-t3)' }}>{isManagerOrHr ? 'All caught up. No pending requests.' : 'No pending approvals.'}</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {pendingList.map((lr, idx) => (
                <div key={lr.id} className="flex items-center gap-3 px-5 py-4" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--c-border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--c-surface)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '18px' }}>schedule_send</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold break-words" style={{ color: 'var(--c-t1)' }}>{lr.leave_type.name} · {lr.days}d</p>
                    <p className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{formatDate(lr.from_date)}</p>
                  </div>
                  {isManagerOrHr && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => actionMutation.mutate({ id: lr.id, action: 'approve' })}
                        disabled={actionMutation.isPending}
                        className="h-8 px-4 text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectId(lr.id)}
                        className="h-8 px-4 text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-all"
                        style={{ backgroundColor: 'rgba(186,26,26,0.08)', color: '#ba1a1a' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-sm rounded-3xl" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)', boxShadow: '0px 20px 40px rgba(15,23,42,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold px-1" style={{ color: 'var(--c-t1)' }}>Leave Type</Label>
              <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                <SelectTrigger className="input-kinetic h-12 px-4 shadow-none">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl" style={{ backgroundColor: 'var(--c-card)' }}>
                  {leaveTypes.map((lt) => <SelectItem key={lt.id} value={lt.id} className="rounded-xl">{lt.name} ({lt.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold px-1" style={{ color: 'var(--c-t1)' }}>From</Label>
                <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} className="input-kinetic w-full h-12 px-4 text-sm font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold px-1" style={{ color: 'var(--c-t1)' }}>To</Label>
                <input type="date" value={form.to_date} min={form.from_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} className="input-kinetic w-full h-12 px-4 text-sm font-medium" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold px-1" style={{ color: 'var(--c-t1)' }}>Reason <span className="font-normal opacity-50">(optional)</span></Label>
              <Textarea placeholder="Briefly describe reason..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="input-kinetic w-full px-4 py-3 text-sm resize-none shadow-none" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-3 pt-2">
            <button onClick={() => setApplyOpen(false)} className="flex-1 h-12 rounded-full text-sm font-bold transition-colors" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>Cancel</button>
            <button onClick={() => applyMutation.mutate()} disabled={!form.leave_type_id || !form.from_date || !form.to_date || applyMutation.isPending} className="btn-primary flex-1 h-12 text-sm disabled:opacity-50">
              {applyMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason('') }}>
        <DialogContent className="max-w-sm rounded-3xl" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)', boxShadow: '0px 20px 40px rgba(15,23,42,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Reject Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-bold px-1" style={{ color: 'var(--c-t1)' }}>Reason for rejection</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide rejection context..." className="input-kinetic w-full px-4 py-3 text-sm resize-none shadow-none" />
          </div>
          <DialogFooter className="flex-row gap-3 pt-2">
            <button onClick={() => setRejectId(null)} className="flex-1 h-12 rounded-full text-sm font-bold transition-colors" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>Cancel</button>
            <button onClick={() => rejectId && actionMutation.mutate({ id: rejectId, action: 'reject', reason: rejectReason })} disabled={!rejectReason || actionMutation.isPending} className="flex-1 h-12 rounded-full text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all" style={{ backgroundColor: '#ba1a1a' }}>Reject</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function LeavesPage() {
  return <LeavesPanel />
}
