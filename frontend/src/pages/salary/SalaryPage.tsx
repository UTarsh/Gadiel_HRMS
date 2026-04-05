import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Check, X, Download, FileText, IndianRupee, TrendingUp } from 'lucide-react'
import { compensationApi } from '@/api/compensation'
import { useAuthStore } from '@/store/auth'
import type { Payslip as PayslipDoc } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

async function downloadPayslipBlob(pdfUrl: string) {
  const blobRes = await compensationApi.downloadPayslipFile(pdfUrl)
  const filename = pdfUrl.split('/').pop() || 'payslip'
  const blob = new Blob([blobRes.data], { type: filename.endsWith('.html') ? 'text/html' : 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const DAILY_INSIGHTS = [
  "Every salary is a reward for showing up and giving your best — keep that streak alive.",
  "Your paycheck reflects your contribution. Keep growing and so will your earnings.",
  "Consistency in effort is the best investment in your own career.",
  "Financial clarity starts with understanding your own compensation.",
  "Small improvements every day lead to big career leaps over time.",
  "Your skills are your assets. The more you invest in them, the higher your returns.",
  "Reliability and dedication are qualities that eventually show up in your compensation.",
  "A great team and a great paycheck often come hand in hand.",
  "Showing up on time, every time, is the simplest form of professional excellence.",
  "Growth mindset + consistent effort = the perfect formula for career progression.",
  "Your payslip is proof that hard work has tangible rewards.",
  "The best investment you can make is in yourself — every skill adds to your value.",
  "Punctuality, reliability, and quality work — these are the building blocks of a great career.",
  "Every day at work is an opportunity to make a difference and grow professionally.",
  "Financial wellness starts with knowing exactly what you earn and how.",
  "The most valuable asset in any organisation is engaged, motivated people.",
  "Your salary is a milestone, not a destination — keep pushing forward.",
  "Great careers are built one consistent, excellent day at a time.",
  "Collaboration and contribution are the fastest paths to recognition.",
  "Celebrate your progress — every payslip is evidence of your hard work.",
  "Invest in your skills today for a better compensation tomorrow.",
  "Your professional reputation is your most valuable currency.",
  "Work smart, stay dedicated, and the rewards will follow naturally.",
  "Every payslip tells a story of dedication and consistent effort.",
  "The most successful people combine passion with persistence — that's where growth lives.",
  "Your work matters. Your contribution shapes the organisation every single day.",
  "A clear understanding of your salary empowers better financial decisions.",
  "Continuous learning is the fastest route to salary growth.",
  "People who invest in their own development create their own opportunities.",
  "Your career is a marathon, not a sprint — steady effort wins every time.",
  "Each day you show up is a day you invest in your own future.",
]

function getDailyInsight(): string {
  const day = new Date().getDate()
  return DAILY_INSIGHTS[(day - 1) % DAILY_INSIGHTS.length]
}

export function SalaryPage() {
  const { employee } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = employee?.role === 'super_admin' || employee?.role === 'hr_admin'

  const [editingField, setEditingField] = useState<'ctc' | 'monthly' | null>(null)
  const [draftCtc, setDraftCtc] = useState('')
  const [draftMonthly, setDraftMonthly] = useState('')

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['salary-overview'],
    queryFn: () => compensationApi.overview(),
  })

  const { data: payslipsData } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => compensationApi.myPayslips({ per_page: 24 }),
  })

  const updateSalaryMutation = useMutation({
    mutationFn: (data: Record<string, number>) =>
      compensationApi.updateSalary(employee!.id, data),
    onSuccess: () => {
      toast.success('Salary updated')
      setEditingField(null)
      qc.invalidateQueries({ queryKey: ['salary-overview'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update salary'),
  })

  const overview = overviewData?.data?.data
  const salary = overview?.salary
  const payslips = (payslipsData?.data && Array.isArray(payslipsData.data)) ? payslipsData.data : []

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  const annualCTC = salary?.ctc_annual || (salary?.gross_salary || 0) * 12
  const monthlyGross = salary?.gross_salary || 0

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Compensation</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Salary & Payslips
        </h1>
        <p className="text-sm font-medium opacity-50" style={{ color: 'var(--c-t2)' }}>
          Your earnings and payslip history
        </p>
      </div>

      {/* Top 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Annual CTC */}
        <div className="card-kinetic p-7 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ backgroundColor: '#2563EB', transform: 'translate(30%, -30%)' }}></div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#2563EB15' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Annual CTC</p>
                <p className="text-[10px] text-slate-300 font-medium">Total cost to company</p>
              </div>
            </div>
            {isAdmin && editingField !== 'ctc' && (
              <button
                onClick={() => { setDraftCtc(String(Math.round(annualCTC))); setEditingField('ctc') }}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'var(--c-surface)' }}
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
          {editingField === 'ctc' ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Annual CTC (₹)</p>
                <input
                  type="number"
                  value={draftCtc}
                  onChange={e => setDraftCtc(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ borderColor: '#2563EB40', color: 'var(--c-t1)', backgroundColor: 'var(--c-surface)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSalaryMutation.mutate({ annual_ctc: Number(draftCtc) })}
                  disabled={updateSalaryMutation.isPending}
                  className="flex-1 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  {updateSalaryMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setEditingField(null)} className="flex-1 h-9 rounded-xl text-xs font-bold" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                  <X className="w-3 h-3 inline mr-1" />Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{fmt(annualCTC)}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{fmt(monthlyGross)}/month</p>
            </div>
          )}
        </div>

        {/* Monthly Salary */}
        <div className="card-kinetic p-7 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ backgroundColor: '#16A34A', transform: 'translate(30%, -30%)' }}></div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#16A34A15' }}>
                <IndianRupee className="w-5 h-5" style={{ color: '#16A34A' }} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Salary</p>
                <p className="text-[10px] text-slate-300 font-medium">In-hand every month</p>
              </div>
            </div>
            {isAdmin && editingField !== 'monthly' && (
              <button
                onClick={() => { setDraftMonthly(String(Math.round(monthlyGross))); setEditingField('monthly') }}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'var(--c-surface)' }}
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
          {editingField === 'monthly' ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Salary (₹)</p>
                <input
                  type="number"
                  value={draftMonthly}
                  onChange={e => setDraftMonthly(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-green-200"
                  style={{ borderColor: '#16A34A40', color: 'var(--c-t1)', backgroundColor: 'var(--c-surface)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSalaryMutation.mutate({ gross_salary: Number(draftMonthly) })}
                  disabled={updateSalaryMutation.isPending}
                  className="flex-1 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  {updateSalaryMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setEditingField(null)} className="flex-1 h-9 rounded-xl text-xs font-bold" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                  <X className="w-3 h-3 inline mr-1" />Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{fmt(monthlyGross)}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Annual: {fmt(annualCTC)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Insight card */}
      <div className="card-kinetic p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex items-start gap-5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>lightbulb</span>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">Today's Insight</p>
            <p className="text-sm font-semibold leading-relaxed text-white">
              "{getDailyInsight()}"
            </p>
          </div>
        </div>
      </div>

      {/* Payslips Log */}
      <div className="card-kinetic overflow-hidden">
        <div className="px-7 py-5 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-border3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>Payslips</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly records</p>
            </div>
          </div>
          {payslips.length > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border text-blue-600" style={{ borderColor: 'var(--c-border3)' }}>
              {payslips.length} record{payslips.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {payslips.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30">
            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No payslips generated yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--c-border3)' }}>
            {payslips.map((ps: PayslipDoc) => (
              <div key={ps.id} className="flex items-center gap-4 px-7 py-4 hover:bg-blue-50/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black uppercase text-slate-600 shrink-0" style={{ backgroundColor: 'var(--c-surface)' }}>
                  {MONTH_NAMES[ps.month - 1].slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: 'var(--c-t1)' }}>{MONTH_NAMES[ps.month - 1]} {ps.year}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                      ps.status === 'finalized' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {ps.status}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: 'var(--c-t1)' }}>{fmt(ps.net_salary)}</p>
                  {ps.pdf_url && (
                    <button
                      onClick={() => downloadPayslipBlob(ps.pdf_url!).catch(() => {})}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1 hover:underline"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
