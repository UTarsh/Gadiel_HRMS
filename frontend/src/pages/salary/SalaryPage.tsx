import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { compensationApi } from '@/api/compensation'
import { useAuthStore } from '@/store/auth'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import type { Payslip as PayslipDoc } from '@/types'

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function SalaryPage() {
  const { employee } = useAuthStore()

  const { data: overviewData } = useQuery({
    queryKey: ['salary-overview'],
    queryFn: () => compensationApi.overview(),
  })

  const { data: payslipsData } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => compensationApi.myPayslips({ per_page: 24 }),
  })

  const overview = overviewData?.data?.data
  const salary = overview?.salary
  const payslips = (payslipsData?.data && Array.isArray(payslipsData.data)) ? payslipsData.data : []

  const annualCTC = salary?.ctc_annual || (salary?.gross_salary || 0) * 12
  const monthlyGross = salary?.gross_salary || 0
  const netTakeHome = monthlyGross > 0 ? monthlyGross * 0.9 : 0 // mock deductions

  const donutData = [
    { name: 'Earnings', value: monthlyGross, color: '#3B82F6' },
    { name: 'Deductions', value: monthlyGross * 0.1, color: '#F87171' },
  ]

  const trendData = [
    { name: 'Apr', val: 98000 }, { name: 'May', val: 120000 }, { name: 'Jun', val: 130000 },
    { name: 'Jul', val: 140000 }, { name: 'Aug', val: 145000 }, { name: 'Sep', val: 155000 },
    { name: 'Oct', val: 150000 }, { name: 'Nov', val: 180000 }, { name: 'Dec', val: 165000 },
    { name: 'Jan', val: 190000 }, { name: 'Feb', val: 216000 }, { name: 'Mar', val: 240000 }
  ]

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER BANNER */}
      <div className="rounded-3xl p-8 relative flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFF0E5 0%, #FFDFCF 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.1)' }}>
        <div>
          <p className="text-[10px] uppercase font-bold text-[#3B82F6] mb-1">PAYROLL</p>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-display">Salary & Payslips</h1>
          <p className="text-[#4B5563] text-sm">View, download, and manage your salary details.</p>
        </div>
        <button className="bg-white hover:bg-gray-50 text-[#3B82F6] font-bold py-2.5 px-6 rounded-xl transition text-sm flex items-center gap-2 border border-[#E2E8F0] shadow-sm">
           <span className="material-symbols-outlined text-sm">download</span> Download Tax Report
        </button>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'NET TAKE HOME', val: netTakeHome || 240000, sub: 'April 2025', icon: 'account_balance_wallet', bg: '#EFF6FF', color: '#3B82F6' },
          { title: 'MONTHLY SALARY', val: monthlyGross || 20000, sub: 'CTC per month', icon: 'payments', bg: '#F0FDF4', color: '#16A34A' },
          { title: 'NEXT PAYDAY', val: '05 May 2025', sub: '3 Days to go', icon: 'event', bg: '#FFFBEB', color: '#D97706' },
          { title: 'PAY FREQUENCY', val: 'Monthly', sub: 'Last paid on 05 Apr 2025', icon: 'schedule', bg: '#F5F3FF', color: '#8B5CF6' },
        ].map((s, i) => (
          <div key={i} className={`rounded-[20px] p-5 shadow-sm border border-white`} style={{ backgroundColor: s.bg }}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.title}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center opacity-70" style={{ color: s.color, backgroundColor: `${s.color}20` }}>
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-black text-[#1A1A2E] font-display">{typeof s.val === 'number' ? fmt(s.val) : s.val}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ALERT */}
      <div className="bg-[#3B82F6] rounded-xl p-4 flex items-center gap-3 text-white shadow-md">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
          <span className="material-symbols-outlined text-sm">tips_and_updates</span>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#DBEAFE]">TODAY'S SUMMARY</p>
          <p className="text-sm font-semibold">Your hard work fuels our success. Keep shining! ✨</p>
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Salary Breakup */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base">Salary Breakup</h3>
            <button className="bg-[#F8FAFC] text-[#4B5563] text-xs font-semibold flex items-center px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
              April 2025 <span className="material-symbols-outlined text-[16px] ml-1">expand_more</span>
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Earnings */}
            <div className="flex-1">
              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b pb-1 border-gray-100">
                <span>EARNINGS</span><span>AMOUNT (₹)</span>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  {n:'Basic Salary', v: 12000},
                  {n:'House Rent Allowance', v: 5000},
                  {n:'Special Allowance', v: 2000},
                  {n:'Transport Allowance', v: 1600},
                  {n:'Other Allowances', v: 1400},
                ].map(r => (
                  <div key={r.n} className="flex justify-between text-[11px] font-semibold text-[#4B5563]">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> {r.n}</span>
                    <span>{r.v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold bg-[#F0FDF4] text-[#16A34A] p-2 rounded-lg">
                <span>Total Earnings</span><span>₹22,000</span>
              </div>
            </div>

            {/* Chart middle */}
            <div className="w-32 shrink-0 flex flex-col justify-center items-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={donutData} innerRadius={40} outerRadius={55} paddingAngle={0} dataKey="value" stroke="none">
                    {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none mt-[-68px]">
                <span className="text-[14px] font-extrabold text-[#1A1A2E] font-display">₹22,000</span>
                <span className="text-[8px] text-[#6B7280] font-semibold">Total Earnings</span>
              </div>
              <div className="flex gap-3 text-[9px] font-bold mt-2">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>Earnings</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#F87171]"></div>Deductions</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="flex-1">
              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b pb-1 border-gray-100">
                <span>DEDUCTIONS</span><span>AMOUNT (₹)</span>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  {n:'Provident Fund (PF)', v: 1800},
                  {n:'Professional Tax', v: 200},
                  {n:'Income Tax (TDS)', v: 1200},
                  {n:'ESI', v: 300},
                  {n:'Other Deductions', v: 500},
                ].map(r => (
                  <div key={r.n} className="flex justify-between text-[11px] font-semibold text-[#4B5563]">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> {r.n}</span>
                    <span>{r.v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold bg-[#FEF2F2] text-[#EF4444] p-2 rounded-lg">
                <span>Total Deductions</span><span>₹4,000</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm font-extrabold bg-[#EFF6FF] text-[#3B82F6] p-3 rounded-xl mt-6">
            <span className="uppercase tracking-widest text-xs">NET TAKE HOME</span><span>₹18,000</span>
          </div>
        </div>

        {/* Generate Payslip & Yearly Overview */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base mb-1">Generate Payslip</h3>
            <p className="text-xs text-[#6B7280] mb-4">Download your payslip for any month.</p>
            <div className="flex items-center gap-3 mb-4">
              <select className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm font-semibold outline-none text-[#1A1A2E]">
                <option>April 2025</option><option>March 2025</option>
              </select>
            </div>
            <button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-2.5 rounded-xl transition text-sm flex justify-center items-center gap-2 shadow-md">
               <span className="material-symbols-outlined text-[16px]">download</span> Generate Payslip
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-2">Payslip will be in PDF format</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex-1">
             <h3 className="text-[#1A1A2E] font-bold font-display text-base mb-4">Yearly Overview <span className="text-xs font-medium text-gray-400">(FY 2024-25)</span></h3>
             <div className="flex gap-2 mb-6">
               <div className="bg-[#F0FDF4] p-2 rounded-lg flex-1">
                 <p className="text-sm font-bold text-[#16A34A]">₹2,64,000</p><p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Total Earnings</p>
               </div>
               <div className="bg-[#FEF2F2] p-2 rounded-lg flex-1">
                 <p className="text-sm font-bold text-[#EF4444]">₹48,000</p><p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Total Deductions</p>
               </div>
               <div className="bg-[#EFF6FF] p-2 rounded-lg flex-1">
                 <p className="text-sm font-bold text-[#3B82F6]">₹2,16,000</p><p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Total Take Home</p>
               </div>
             </div>
             <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <Area type="monotone" dataKey="val" stroke="#3B82F6" strokeWidth={2} fill="url(#colorSal)" />
                    <defs>
                      <linearGradient id="colorSal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW 1: Tax / Exemption CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <span className="material-symbols-outlined text-[18px]">home</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">HRA Exemption</p>
              <p className="text-lg font-black text-[#1A1A2E] font-display">₹1,20,000</p>
              <p className="text-[10px] text-[#3B82F6] font-bold cursor-pointer hover:underline mt-1">View Details →</p>
            </div>
         </div>
         <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-[#16A34A]">
              <span className="material-symbols-outlined text-[18px]">security</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Tax Regime</p>
              <p className="text-lg font-black text-[#1A1A2E] font-display">Old Regime</p>
              <p className="text-[10px] text-[#16A34A] font-bold cursor-pointer hover:underline mt-1">View Details →</p>
            </div>
         </div>
         <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Projected Annual CTC</p>
              <p className="text-lg font-black text-[#1A1A2E] font-display">{fmt(annualCTC)}</p>
              <p className="text-[10px] text-[#D97706] font-bold cursor-pointer hover:underline mt-1">View Breakdown →</p>
            </div>
         </div>
      </div>

      {/* BOTTOM ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payslip History */}
        <div className="lg:col-span-8 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[#1A1A2E] font-bold font-display text-base">Payslip History</h3>
              <p className="text-[11px] text-gray-500 font-medium">View and download your past payslips.</p>
            </div>
            <button className="bg-white border border-[#E2E8F0] shadow-sm text-[#3B82F6] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-50 transition">View All</button>
          </div>
          <div className="w-full relative overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead>
                 <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
                   <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Month & Year</th>
                   <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Pay Date</th>
                   <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Net Take Home</th>
                   <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Status</th>
                   <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B7280] text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#E2E8F0]">
                 {[
                   {m: 'April 2025', d: '05 Apr 2025', val: '₹18,000', stat: 'Paid'},
                   {m: 'March 2025', d: '05 Mar 2025', val: '₹18,000', stat: 'Paid'},
                   {m: 'February 2025', d: '05 Feb 2025', val: '₹18,000', stat: 'Paid'},
                   {m: 'January 2025', d: '05 Jan 2025', val: '₹18,000', stat: 'Paid'},
                   {m: 'December 2024', d: '05 Dec 2024', val: '₹18,000', stat: 'Paid'},
                 ].map((r, i) => (
                   <tr key={i} className="hover:bg-[#F8FAFC] transition">
                     <td className="px-4 py-4 font-bold text-[#1A1A2E] flex items-center gap-3">
                       <span className="material-symbols-outlined text-[#3B82F6] bg-[#EFF6FF] p-1.5 rounded-lg text-[16px]">description</span>{r.m}
                     </td>
                     <td className="px-4 py-4 text-xs text-[#4B5563] font-semibold">{r.d}</td>
                     <td className="px-4 py-4 text-xs font-bold text-[#1A1A2E]">{r.val}</td>
                     <td className="px-4 py-4 text-center">
                       <span className="text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded uppercase tracking-wider">{r.stat}</span>
                     </td>
                     <td className="px-4 py-4 text-right">
                       <div className="flex items-center justify-end gap-3 text-[11px] font-bold text-[#3B82F6]">
                         <span className="flex items-center gap-1 cursor-pointer hover:underline"><span className="material-symbols-outlined text-[14px]">visibility</span> View</span>
                         <span className="flex items-center gap-1 cursor-pointer hover:underline"><span className="material-symbols-outlined text-[14px]">download</span> Download</span>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>

        {/* Need Help? */}
        <div className="lg:col-span-4 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex flex-col items-center">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base w-full mb-1">Need Help?</h3>
            <p className="text-[11px] text-gray-500 font-medium w-full mb-6">We're here to help you with your payroll queries.</p>
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">help_center</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#1A1A2E]">Payroll FAQs</p>
                  <p className="text-[10px] text-gray-500 font-medium">Get answers to common questions</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">live_help</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#1A1A2E]">Raise a Query</p>
                  <p className="text-[10px] text-gray-500 font-medium">Submit your payroll issue</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#1A1A2E]">Contact Payroll Team</p>
                  <p className="text-[10px] text-gray-500 font-medium">payroll@gadel.com</p>
                </div>
              </div>
            </div>
            {/* Visual illustration space at bottom */}
            <div className="mt-auto pt-6 flex justify-end w-full">
               <span className="material-symbols-outlined text-[64px] text-blue-100 transform rotate-12">headset_mic</span>
            </div>
        </div>

      </div>

    </div>
  )
}
