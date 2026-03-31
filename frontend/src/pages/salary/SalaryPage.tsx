import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Loader2, Banknote, TrendingUp, TrendingDown, 
  Plus, Download, CalendarDays, Wallet,
  PieChart, History, ChevronRight, Target, FileText
} from 'lucide-react'
import { compensationApi } from '@/api/compensation'
import { RingChart } from '@/components/shared/RingChart'
import type { Payslip as PayslipDoc } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
// PDF links usually point to the file directly on the backend
const FILE_BASE_URL = (BASE_URL as string).replace('/api/v1', '')

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(v || 0)
}

function ProgressIndicator({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function SalaryPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showAddRecord, setShowAddRecord] = useState(false)
  
  const qc = useQueryClient()

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['salary-overview', month, year],
    queryFn: () => compensationApi.overview({ month, year }),
  })

  const { data: recordsData } = useQuery({
    queryKey: ['salary-records', month, year],
    queryFn: () => compensationApi.trackerRecords({ month, year }),
  })

  const { data: payslipsData } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => compensationApi.myPayslips({ per_page: 5 }),
  })

  const addRecordMutation = useMutation({
    mutationFn: (vals: { title: string; amount: number; record_type: 'expense' | 'income' | 'savings' }) => 
      compensationApi.addTrackerRecord({
        month, year,
        record_date: new Date().toISOString().split('T')[0],
        ...vals
      }),
    onSuccess: () => {
      toast.success('Record added successfully')
      setShowAddRecord(false)
      qc.invalidateQueries({ queryKey: ['salary-overview'] })
      qc.invalidateQueries({ queryKey: ['salary-records'] })
    },
    onError: () => toast.error('Failed to add record'),
  })

  const overview = overviewData?.data?.data
  const records = recordsData?.data?.data ?? []
  const payslips = (payslipsData?.data && Array.isArray(payslipsData.data)) ? payslipsData.data : []

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 page-enter pb-10">
      {/* ── Light Blue Premium Header ── */}
      <div className="card-kinetic p-8 md:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E0F2FE, #DBEAFE)', border: 'none shadow-xl shadow-blue-100/50' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-200">
              <Banknote className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Earnings Portal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              Financial <span className="text-blue-600 italic">Portfolio</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-lg font-medium">Verify your disbursement accuracy, track personal fiscal growth, and manage your monthly organizational budget.</p>
          </div>

          <div className="flex bg-white/60 p-1.5 rounded-2xl border border-white gap-1 shadow-inner">
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none bg-transparent font-bold px-4 py-2 rounded-xl text-sm focus:outline-none cursor-pointer hover:bg-white transition-all"
            >
              {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <div className="w-px bg-slate-200 my-2"></div>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none bg-transparent font-bold px-4 py-2 rounded-xl text-sm focus:outline-none cursor-pointer hover:bg-white transition-all"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: "Net Disbursement", 
            value: formatCurrency(overview?.salary?.net_salary || 0), 
            icon: Banknote, 
            color: "blue",
            sub: "Creditable Amount",
            trend: overview?.salary_available ? "Verified" : "Projected"
          },
          { 
            label: "Gross Compensation", 
            value: formatCurrency(overview?.salary?.gross_salary || 0), 
            icon: Wallet, 
            color: "indigo",
            sub: "Pre-tax Earnings",
            trend: "Standard"
          },
          { 
            label: "Fiscal Deductions", 
            value: formatCurrency(overview?.salary?.total_deductions || 0), 
            icon: TrendingDown, 
            color: "rose",
            sub: "Tax & Contributions",
            trend: "Calculated"
          },
          { 
            label: "Monthly Progress", 
            value: `${Math.round(overview?.salary?.progress_percent || 0)}%`, 
            icon: TrendingUp, 
            color: "emerald",
            sub: "Cycle Maturity",
            trend: "In Progress"
          }
        ].map((s, i) => (
          <div key={i} className="card-kinetic p-6 group hover:translate-y-[-4px] transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-opacity-30", 
                s.color === 'blue' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-200" :
                s.color === 'indigo' ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200" :
                s.color === 'rose' ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-rose-200" :
                "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-emerald-200"
              )}>
                <s.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--c-t1)' }}>{s.trend}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">{s.label}</p>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{s.value}</h3>
            <p className="text-[10px] mt-4 font-bold opacity-40 uppercase tracking-widest">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* ── Salary Breakdown Area ── */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="card-kinetic p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--c-t1)' }}>Compensation Topology</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pre-tax Component Breakdown</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
              <div className="flex justify-center">
                <RingChart 
                  value={overview?.salary?.progress_percent || 0} 
                  size={160} 
                  strokeWidth={14} 
                  color="#2563EB" 
                  trackColor="#F1F5F9"
                >
                  <p className="text-xl font-black text-slate-900 leading-none">{Math.round(overview?.salary?.progress_percent || 0)}%</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Status</p>
                </RingChart>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { label: "Basic Pay", val: overview?.salary?.basic_salary || 0, color: "bg-blue-600" },
                  { label: "House Rent Allowance", val: overview?.salary?.hra || 0, color: "bg-indigo-500" },
                  { label: "Special Allowance", val: overview?.salary?.special_allowance || 0, color: "bg-teal-500" },
                  { label: "CTC (Annualized)", val: overview?.salary?.ctc_annual || 0, color: "bg-slate-800" },
                ].map((c, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", c.color)} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                    </div>
                    <p className="text-sm font-black" style={{ color: 'var(--c-t1)' }}>{formatCurrency(c.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-kinetic p-6 md:p-8">
             <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--c-t1)' }}>Recent Vouchers</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest 5 Payslips</p>
                </div>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">View All Records</button>
            </div>

            <div className="space-y-4">
              {payslips.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero Vouchers Identified</p>
                </div>
              ) : (
                payslips.map((ps: PayslipDoc) => (
                  <div key={ps.id} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase group-hover:bg-white transition-colors shadow-sm">
                        {monthNames[ps.month-1].slice(0,3)}
                      </div>
                      <div>
                        <p className="text-xs font-black" style={{ color: 'var(--c-t1)' }}>{monthNames[ps.month-1]} {ps.year}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status: {ps.status}</p>
                      </div>
                    </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <p className="text-xs font-black" style={{ color: 'var(--c-t1)' }}>{formatCurrency(ps.net_salary)}</p>
                        {ps.pdf_url && (
                          <a 
                            href={ps.pdf_url.startsWith('http') ? ps.pdf_url : `${FILE_BASE_URL}${ps.pdf_url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Personal Tracker Sidebar ── */}
        <div className="space-y-6">
          <div className="card-kinetic p-6 md:p-8" style={{ background: 'linear-gradient(to bottom, #FAFAFA, #FFFFFF)', border: '1px solid var(--c-border3)' }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--c-t1)' }}>Fiscal Tracker</h3>
              </div>
              <button 
                onClick={() => setShowAddRecord(!showAddRecord)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <ProgressIndicator 
                  label="Budget Allocation" 
                  value={(overview?.tracker?.planned_budget || 0) > 0 ? ((overview?.tracker?.spent_amount || 0) / (overview?.tracker?.planned_budget || 0)) * 100 : 0} 
                />
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(overview?.tracker?.spent_amount || 0)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Of Budget</p>
                      <p className="text-sm font-black text-slate-400">{formatCurrency(overview?.tracker?.planned_budget || 0)}</p>
                   </div>
                </div>
              </div>

              {showAddRecord && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4">
                   <input className="input-kinetic h-10 text-xs w-full" placeholder="Record Title (e.g. Rent, Groceries)" id="rec-title" />
                   <div className="flex gap-2">
                      <input className="input-kinetic h-10 text-xs flex-1" placeholder="Amount" type="number" id="rec-amt" />
                      <select className="input-kinetic h-10 text-[10px] font-bold uppercase" id="rec-type">
                        <option value="expense">Expense</option>
                        <option value="income">Credits</option>
                      </select>
                   </div>
                   <button 
                    onClick={() => {
                      const t = (document.getElementById('rec-title') as HTMLInputElement).value
                      const a = (document.getElementById('rec-amt') as HTMLInputElement).value
                      const type = (document.getElementById('rec-type') as HTMLSelectElement).value as 'expense' | 'income'
                      
                      if(!t) { toast.error('Enter a title'); return; }
                      if(!a || Number(a) <= 0) { toast.error('Enter a valid amount'); return; }
                      
                      addRecordMutation.mutate({ title: t, amount: Number(a), record_type: type as any })
                    }}
                    disabled={addRecordMutation.isPending}
                    className="w-full h-10 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                   >
                     Deploy Record
                   </button>
                </div>
              )}

              <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--c-border3)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temporal Log</p>
                </div>
                {records.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No records for this period.</p>
                ) : (
                  records.slice(0, 5).map(r => (
                    <div key={r.id} className="flex justify-between items-center group">
                       <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{r.title}</p>
                       <p className={cn("text-xs font-black font-mono", r.record_type === 'expense' ? "text-rose-500" : "text-emerald-500")}>
                         {r.record_type === 'expense' ? '-' : '+'}{formatCurrency(r.amount).replace('₹', '')}
                       </p>
                    </div>
                  ))
                )}
                {records.length > 5 && (
                  <button className="w-full py-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-700">Reveal Full Ledger</button>
                )}
              </div>
            </div>
          </div>

          <div className="card-kinetic p-6 bg-slate-900 text-white overflow-hidden relative">
             <div className="absolute inset-0 bg-blue-600 opacity-20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2"></div>
             <div className="relative z-10 flex flex-col gap-6">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 mb-2">Fiscal Insight</p>
                   <p className="text-sm font-medium leading-relaxed italic opacity-90">"Strategic financial planning is the foundation of organizational stability and personal prosperity."</p>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Support</span>
                   <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
