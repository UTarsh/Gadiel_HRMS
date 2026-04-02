import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Check, X, Download, FileText, ChevronRight, IndianRupee, TrendingUp, Shield } from 'lucide-react'
import { compensationApi } from '@/api/compensation'
import { useAuthStore } from '@/store/auth'
import type { Payslip as PayslipDoc } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
const FILE_BASE_URL = (BASE_URL as string).replace('/api/v1', '')

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface EditableCardProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  value: string
  subValue?: string
  accentColor: string
  canEdit: boolean
  editFields: { label: string; key: string; value: string }[]
  onSave: (vals: Record<string, string>) => void
  saving?: boolean
}

function EditableCard({ title, subtitle, icon, value, subValue, accentColor, canEdit, editFields, onSave, saving }: EditableCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  function startEdit() {
    const d: Record<string, string> = {}
    editFields.forEach(f => { d[f.key] = f.value })
    setDraft(d)
    setEditing(true)
  }

  return (
    <div className="card-kinetic p-7 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ backgroundColor: accentColor, transform: 'translate(30%, -30%)' }}></div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${accentColor}15` }}>
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
            <p className="text-[10px] text-slate-300 font-medium">{subtitle}</p>
          </div>
        </div>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'var(--c-surface)' }}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <div>
            <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{value}</p>
            {subValue && <p className="text-xs text-slate-400 mt-1 font-medium">{subValue}</p>}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {editFields.map(f => (
            <div key={f.key}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>
              <input
                type="number"
                value={draft[f.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-blue-200"
                style={{ borderColor: `${accentColor}40`, color: 'var(--c-t1)', backgroundColor: 'var(--c-surface)' }}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { onSave(draft); setEditing(false) }}
              disabled={saving}
              className="flex-1 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl text-xs font-bold" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>
              <X className="w-3 h-3 inline mr-1" />Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SalaryPage() {
  const { employee } = useAuthStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const qc = useQueryClient()
  const isAdmin = employee?.role === 'super_admin' || employee?.role === 'hr_admin'

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['salary-overview', month, year],
    queryFn: () => compensationApi.overview({ month, year }),
  })

  const { data: payslipsData } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => compensationApi.myPayslips({ per_page: 12 }),
  })

  const updateSalaryMutation = useMutation({
    mutationFn: (data: Record<string, number>) =>
      compensationApi.updateSalary(employee!.id, data),
    onSuccess: () => {
      toast.success('Salary updated successfully')
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

  const annualCTC = (salary?.ctc_annual || (salary?.gross_salary || 0) * 12)
  const monthlyGross = salary?.gross_salary || 0
  const deductions = salary?.total_deductions || 0
  const netSalary = salary?.net_salary || monthlyGross

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Compensation</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>
            Salary & Payslips
          </h1>
          <p className="text-sm font-medium opacity-50" style={{ color: 'var(--c-t2)' }}>
            Your earnings breakdown and payslip history
          </p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border gap-1 shadow-sm" style={{ borderColor: 'var(--c-border2)' }}>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="appearance-none bg-transparent font-bold px-4 py-2 rounded-xl text-sm focus:outline-none cursor-pointer hover:bg-slate-50 transition-all"
            style={{ color: 'var(--c-t1)' }}
          >
            {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <div className="w-px my-2 bg-slate-200"></div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="appearance-none bg-transparent font-bold px-4 py-2 rounded-xl text-sm focus:outline-none cursor-pointer hover:bg-slate-50 transition-all"
            style={{ color: 'var(--c-t1)' }}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* 3 Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <EditableCard
          title="Annual CTC"
          subtitle="Total cost to company"
          icon={<TrendingUp className="w-5 h-5" />}
          value={fmt(annualCTC)}
          subValue={`${fmt(monthlyGross)}/month`}
          accentColor="#2563EB"
          canEdit={isAdmin}
          editFields={[{ label: 'Annual CTC (₹)', key: 'annual_ctc', value: String(Math.round(annualCTC)) }]}
          onSave={vals => updateSalaryMutation.mutate({ annual_ctc: Number(vals.annual_ctc) })}
          saving={updateSalaryMutation.isPending}
        />
        <EditableCard
          title="Monthly Salary"
          subtitle="Gross disbursement"
          icon={<IndianRupee className="w-5 h-5" />}
          value={fmt(netSalary)}
          subValue={`Gross: ${fmt(monthlyGross)}`}
          accentColor="#16A34A"
          canEdit={isAdmin}
          editFields={[
            { label: 'Gross Monthly (₹)', key: 'gross_salary', value: String(Math.round(monthlyGross)) },
            { label: 'Net Monthly (₹)', key: 'net_salary', value: String(Math.round(netSalary)) },
          ]}
          onSave={vals => updateSalaryMutation.mutate({ gross_salary: Number(vals.gross_salary), net_salary: Number(vals.net_salary) })}
          saving={updateSalaryMutation.isPending}
        />
        <EditableCard
          title="Benefits"
          subtitle="Components breakdown"
          icon={<Shield className="w-5 h-5" />}
          value={`${fmt(salary?.basic_salary || 0)} Basic`}
          subValue={`HRA: ${fmt(salary?.hra || 0)} · Special: ${fmt(salary?.special_allowance || 0)}`}
          accentColor="#7C3AED"
          canEdit={isAdmin}
          editFields={[
            { label: 'Basic Pay (₹)', key: 'basic_salary', value: String(Math.round(salary?.basic_salary || 0)) },
            { label: 'HRA (₹)', key: 'hra', value: String(Math.round(salary?.hra || 0)) },
            { label: 'Special Allowance (₹)', key: 'special_allowance', value: String(Math.round(salary?.special_allowance || 0)) },
          ]}
          onSave={vals => updateSalaryMutation.mutate({ basic_salary: Number(vals.basic_salary), hra: Number(vals.hra), special_allowance: Number(vals.special_allowance) })}
          saving={updateSalaryMutation.isPending}
        />
      </div>

      {/* Deductions row */}
      {deductions > 0 && (
        <div className="card-kinetic p-5 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <span className="text-rose-600 text-sm font-black">-</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Deductions</p>
            <p className="text-lg font-black text-rose-600">{fmt(deductions)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Take-Home</p>
            <p className="text-lg font-black text-emerald-600">{fmt(netSalary)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payslips */}
        <div className="lg:col-span-2 card-kinetic overflow-hidden">
          <div className="px-7 py-5 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-border3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>Payslips</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly records</p>
              </div>
            </div>
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
                      <a
                        href={ps.pdf_url.startsWith('http') ? ps.pdf_url : `${FILE_BASE_URL}${ps.pdf_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1 hover:underline"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quote + CTC progress */}
        <div className="space-y-5">
          <div className="card-kinetic p-6 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Fiscal Insight</p>
              <p className="text-sm font-semibold leading-relaxed italic text-white">
                "Strategic financial planning is the foundation of organizational stability and personal prosperity."
              </p>
              <div className="h-px bg-white/20"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Gadiel HRMS</span>
                <ChevronRight className="w-4 h-4 text-white/60" />
              </div>
            </div>
          </div>

          {/* Salary breakdown summary */}
          <div className="card-kinetic p-6 space-y-4">
            <h3 className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>Breakdown</h3>
            {[
              { label: 'Basic Pay', val: salary?.basic_salary || 0, pct: monthlyGross ? ((salary?.basic_salary || 0) / monthlyGross) * 100 : 40, color: '#2563EB' },
              { label: 'HRA', val: salary?.hra || 0, pct: monthlyGross ? ((salary?.hra || 0) / monthlyGross) * 100 : 20, color: '#7C3AED' },
              { label: 'Special', val: salary?.special_allowance || 0, pct: monthlyGross ? ((salary?.special_allowance || 0) / monthlyGross) * 100 : 34, color: '#059669' },
            ].map(c => (
              <div key={c.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                  <p className="text-xs font-black" style={{ color: 'var(--c-t1)' }}>{fmt(c.val)}</p>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(c.pct, 100)}%`, backgroundColor: c.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
