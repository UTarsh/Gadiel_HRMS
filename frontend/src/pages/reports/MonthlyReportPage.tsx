import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { 
  Loader2, CalendarDays, CheckCircle2, Clock, 
  MapPin, AlertCircle, Banknote, ShieldAlert,
  ChevronRight, TrendingUp, Users, Presentation, Target,
  FileText, Activity, CloudUpload 
} from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { compensationApi } from '@/api/compensation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(v || 0)
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  if (normalized.includes('approved') || normalized.includes('completed') || normalized.includes('present')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">{status.replace('_', ' ')}</span>
  }
  if (normalized.includes('pending') || normalized.includes('in_progress')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">{status.replace('_', ' ')}</span>
  }
  if (normalized.includes('rejected') || normalized.includes('overdue') || normalized.includes('absent')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-100">{status.replace('_', ' ')}</span>
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-100">{status.replace('_', ' ')}</span>
}

export function MonthlyReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [targetEmpId, setTargetEmpId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { employee } = useAuthStore()
  const isAuthorized = employee?.role === 'hr_admin' || 
                       employee?.role === 'super_admin' || 
                       ['vishal', 'namrata'].includes((employee?.first_name || '').toLowerCase())

  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthly-report', month, year],
    queryFn: () => reportsApi.monthly(month, year),
  })

  const generatePayslips = useMutation({
    mutationFn: () => compensationApi.generatePayslips(month, year),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data?.data?.generated_count ?? 0} payslips`)
      qc.invalidateQueries({ queryKey: ['monthly-report'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Payslip generation failed'),
  })

  const handleUploadClick = (empId: string) => {
    setTargetEmpId(empId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetEmpId) return
    
    const tid = toast.loading('Locating record...')
    try {
      const res = await compensationApi.allPayslips({ 
        employee_id: targetEmpId,
        month,
        year,
        per_page: 1
      })
      
      const payslip = res.data?.data?.[0]
      if (!payslip) {
        toast.dismiss(tid)
        toast.error(`No payslip record found. Run Payroll first.`)
        return
      }
      
      toast.loading('Uploading file...', { id: tid })
      await compensationApi.uploadPayslip(payslip.id, file)
      toast.success(`Payslip uploaded for ${payslip.employee_name}`, { id: tid })
      qc.invalidateQueries({ queryKey: ['monthly-report'] })
    } catch (err) {
      toast.error('Upload failed', { id: tid })
    } finally {
      setTargetEmpId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const report = data?.data?.data

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-10 page-enter">
      {/* ── Premium Intelligence Header ── */}
      <div className="relative rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl shadow-blue-200/50" style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Organizational Intel</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none">
                {monthNames[month-1]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Analysis</span>
              </h1>
              <p className="text-slate-400 mt-4 max-w-xl text-sm md:text-base leading-relaxed font-medium">
                Deep dive into productivity matrices, workforce attendance accuracy, and fiscal allocation for the current period.
              </p>
            </div>
          </div>

          <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] gap-2 shadow-2xl">
            <div className="relative group">
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))} 
                className="appearance-none bg-transparent text-white font-bold pl-5 pr-12 py-3.5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all focus:outline-none text-sm"
              >
                {monthNames.map((m, i) => (
                  <option key={i + 1} value={i + 1} className="text-slate-900">{m}</option>
                ))}
              </select>
              <CalendarDays className="w-4 h-4 text-white/50 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white transition-colors" />
            </div>
            <div className="w-px bg-white/10 my-3"></div>
            <div className="relative">
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))} 
                className="appearance-none bg-transparent text-white font-bold pl-5 pr-12 py-3.5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all focus:outline-none text-sm"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y} className="text-slate-900">{y}</option>
                ))}
              </select>
            </div>
            <div className="w-px bg-white/10 my-3 hidden sm:block"></div>
            {isAuthorized && (
              <button 
                onClick={() => generatePayslips.mutate()} 
                disabled={generatePayslips.isPending}
                className="px-5 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-900 shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
              >
                {generatePayslips.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                {generatePayslips.isPending ? 'Running...' : 'Run Payroll'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[400px] flex items-center justify-center card-kinetic">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : error || !report ? (
        <div className="card-kinetic py-24 text-center border-dashed border-2" style={{ borderColor: 'var(--c-border2)' }}>
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-extrabold" style={{ color: 'var(--c-t1)' }}>Intelligence Missing</h3>
          <p className="text-sm opacity-60 mt-1 max-w-xs mx-auto" style={{ color: 'var(--c-t2)' }}>No operational data recorded for the selected temporal window.</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          
          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* KPI: Tasks */}
            <div className="card-kinetic p-6 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Target className="w-6 h-6" />
                </div>
                <StatusBadge status={report.tasks.overdue > 0 ? "Alert Required" : "Operational"} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--c-t1)' }}>Mission Volume</p>
              <h3 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{report.tasks.total}</h3>
              <div className="mt-6 pt-5 border-t flex justify-between items-center text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: 'var(--c-border3)' }}>
                <span style={{ color: 'var(--c-t4)' }}>Critical Overdue</span>
                <span className="text-red-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  {report.tasks.overdue}
                </span>
              </div>
            </div>

            {/* KPI: Attendance */}
            <div className="card-kinetic p-6 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <div className="bg-white/50 border border-slate-100 px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Logistics</div>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--c-t1)' }}>Logs Ingested</p>
              <h3 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{report.attendance.total_logs}</h3>
              <div className="mt-6 pt-5 border-t flex justify-between items-center text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: 'var(--c-border3)' }}>
                <span style={{ color: 'var(--c-t4)' }}>Verified Present</span>
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {report.attendance.by_status.present ?? 0}
                </span>
              </div>
            </div>

            {/* KPI: Leaves */}
            <div className="card-kinetic p-6 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                  <CalendarDays className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--c-t1)' }}>Exemption Flow</p>
              <h3 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-t1)' }}>{report.leaves.total_requests}</h3>
              <div className="mt-6 pt-5 border-t flex justify-between items-center text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: 'var(--c-border3)' }}>
                <span style={{ color: 'var(--c-t4)' }}>Approved Capacity</span>
                <span className="text-amber-700">{report.leaves.approved_days} DAYS</span>
              </div>
            </div>

            {/* KPI: Payroll */}
            <div className="card-kinetic p-6 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Banknote className="w-6 h-6" />
                </div>
                <div className="bg-white/50 border border-slate-100 px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Fiscal</div>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1 relative z-10" style={{ color: 'var(--c-t1)' }}>Net Disbursement</p>
              <h3 className="text-3xl font-black tracking-tight relative z-10" style={{ color: 'var(--c-t1)' }}>{formatCurrency(report.payroll.total_net)}</h3>
              <div className="mt-6 pt-5 border-t flex justify-between items-center text-[10px] font-bold uppercase tracking-widest relative z-10" style={{ borderColor: 'var(--c-border3)' }}>
                <span style={{ color: 'var(--c-t4)' }}>Vouchers Issued</span>
                <span className="text-blue-600 flex items-center gap-1.5">
                  {report.payroll.generated_payslips} <TrendingUp className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* ── Analytical Breakdowns ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { title: "Mission Velocity", data: report.tasks.by_status, color: "#3B82F6" },
              { title: "Presence Vector", data: report.attendance.by_status, color: "#10B981" },
              { title: "Exemption Ratio", data: report.leaves.by_status, color: "#F59E0B" }
            ].map((section, idx) => (
              <div key={idx} className="card-kinetic p-6 md:p-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 opacity-50" style={{ color: 'var(--c-t1)' }}>{section.title}</h3>
                <div className="space-y-6">
                  {Object.entries(section.data).length === 0 ? (
                    <div className="py-8 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No Sector Data</div>
                  ) : (
                    Object.entries(section.data).map(([k, v]) => {
                      const total: number = Object.values(section.data).reduce((acc: any, val: any) => acc + val, 0) as number
                      const pct = total > 0 ? ((v as number) / total) * 100 : 0
                      
                      return (
                        <div key={k} className="group">
                          <div className="flex justify-between items-center mb-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70" style={{ color: 'var(--c-t1)' }}>
                              {k.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-black" style={{ color: 'var(--c-t1)' }}>{String(v)}</span>
                          </div>
                          <div className="w-full bg-slate-100/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 group-hover:brightness-110 shadow-[0_0_10px_rgba(0,0,0,0.05)]"
                              style={{ width: `${pct}%`, backgroundColor: section.color }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Individual Performance Manifest ── */}
          <div className="card-kinetic overflow-hidden border" style={{ borderColor: 'var(--c-border3)' }}>
            <div className="px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border3)' }}>
              <div>
                <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>Squad Intelligence Manifest</h3>
                <p className="text-xs font-medium opacity-50 uppercase tracking-widest mt-0.5" style={{ color: 'var(--c-t2)' }}>Real-time Individual Performance Snapshot</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{report.employee_snapshot.length} OPERATIVES</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-widest opacity-40" style={{ borderColor: 'var(--c-border3)', color: 'var(--c-t1)' }}>
                    <th className="px-8 py-5">Personnel</th>
                    <th className="px-8 py-5 text-center">Daily Status</th>
                    <th className="px-8 py-5 text-center">Days Worked</th>
                    <th className="px-8 py-5 text-center">Approved Leaves</th>
                    <th className="px-8 py-5">Mission Progress</th>
                    <th className="px-8 py-5 text-right">Fiscal Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--c-border3)' }}>
                  {report.employee_snapshot.map((emp) => {
                    const totalTasks = emp.open_tasks + emp.completed_tasks;
                    const taskPct = totalTasks > 0 ? (emp.completed_tasks / totalTasks) * 100 : 0;
                    
                    return (
                      <tr 
                        key={emp.employee_id} 
                        className="group hover:bg-blue-50/30 transition-all duration-200"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200/50 group-hover:scale-110 transition-transform">
                              {emp.employee_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-sm break-words leading-tight" style={{ color: 'var(--c-t1)' }}>{emp.employee_name}</p>
                              <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter mt-1">ID: {emp.employee_id.split('-')[0]}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-8 py-5 text-center">
                          <StatusBadge status={emp.today_status || 'absent'} />
                        </td>

                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-xl bg-slate-50 border font-black text-xs" style={{ borderColor: 'var(--c-border3)', color: 'var(--c-t1)' }}>
                            {emp.days_worked}
                          </span>
                        </td>
                        
                        <td className="px-8 py-5 text-center">
                          {emp.approved_leave_days > 0 ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black text-xs border border-amber-100">
                              {emp.approved_leave_days} d
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold opacity-30">──</span>
                          )}
                        </td>

                        <td className="px-8 py-5">
                          <div className="max-w-[160px]">
                            <div className="flex justify-between items-center text-[9px] mb-2 font-black uppercase tracking-widest">
                              <span className="text-emerald-600">{emp.completed_tasks} SUCCESS</span>
                              <span className="opacity-40">{emp.open_tasks} PENDING</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex shadow-inner">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 delay-300" 
                                style={{ width: `${taskPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className="font-black text-sm tracking-tight" style={{ color: 'var(--c-t1)' }}>
                              {formatCurrency(emp.net_salary)}
                            </span>
                            {isAuthorized && (
                              <button 
                                onClick={() => handleUploadClick(emp.employee_id)}
                                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Upload Manual Payslip"
                              >
                                <CloudUpload className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {report.employee_snapshot.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center opacity-30 text-xs font-bold uppercase tracking-[0.3em]">
                        No personnel data identified for this sector.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for payslip uploads */}
      <input 
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
