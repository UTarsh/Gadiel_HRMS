import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip, YAxis } from 'recharts'

const lineData = [
  { name: '1 Apr', val: 80 }, { name: '8 Apr', val: 90 }, { name: '15 Apr', val: 85 },
  { name: '16 Apr', val: 94.2 }, { name: '22 Apr', val: 88 }, { name: '30 Apr', val: 92 }
]
const donutData = [
  { name: 'Delhi', value: 40, color: '#3B82F6' },
  { name: 'Wave', value: 30, color: '#10B981' },
  { name: 'Bangalore', value: 15, color: '#F59E0B' },
  { name: 'Remote', value: 15, color: '#8B5CF6' },
]

export function MonthlyReportPage() {
  const [month] = useState(4)
  const [year] = useState(new Date().getFullYear())

  const { data } = useQuery({
    queryKey: ['monthly-report', month, year],
    queryFn: () => reportsApi.monthly(month, year),
  })

  const report = data?.data?.data

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER BANNER */}
      <div className="rounded-3xl p-8 relative flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFF0E5 0%, #FFDFCF 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.1)' }}>
        <div>
          <p className="text-[10px] uppercase font-bold text-[#8B5CF6] mb-1 bg-white/50 inline-block px-2 py-0.5 rounded border border-[#E2E8F0] tracking-widest">HR & CEO VIEW</p>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-display">Monthly Report & Geofence</h1>
          <p className="text-[#4B5563] text-sm">Review workforce performance and manage location boundaries for attendance.</p>
        </div>
        <div className="flex gap-3">
          <select className="bg-white border text-[#4B5563] border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm outline-none">
            <option>📅 April 2025</option>
          </select>
          <select className="bg-white border text-[#4B5563] border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm outline-none">
            <option>All Departments</option>
          </select>
          <select className="bg-white border text-[#4B5563] border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm outline-none">
             <option>All Locations</option>
          </select>
          <button className="bg-white hover:bg-gray-50 text-[#3B82F6] font-bold py-2.5 px-6 rounded-xl transition text-sm flex items-center gap-2 border border-[#E2E8F0] shadow-sm">
             <span className="material-symbols-outlined text-sm">download</span> Export
          </button>
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {[
          { title: 'Total Employees', val: '1,248', sub: '↑ 5.4% vs Mar 2025', icon: 'groups', color: '#3B82F6', up: true },
          { title: 'Avg. Attendance', val: '92.6%', sub: '↑ 2.1% vs Mar 2025', icon: 'trending_up', color: '#10B981', up: true },
          { title: 'Present Days', val: '22,356', sub: '↑ 8.7% vs Mar 2025', icon: 'event_available', color: '#16A34A', up: true },
          { title: 'Absent Days', val: '1,852', sub: '↓ 4.3% vs Mar 2025', icon: 'event_busy', color: '#EF4444', up: false },
          { title: 'On Leave', val: '1,256', sub: '↑ 3.2% vs Mar 2025', icon: 'beach_access', color: '#F59E0B', up: true },
          { title: 'Avg. Late (mins)', val: '18.4', sub: '↓ 1.8% vs Mar 2025', icon: 'schedule', color: '#8B5CF6', up: false },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-70" style={{ color: s.color, backgroundColor: `${s.color}20` }}>
                  <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
               </div>
               <p className="text-[10px] font-bold text-gray-500 tracking-wide">{s.title}</p>
            </div>
            <p className="text-2xl font-black text-[#1A1A2E] font-display mb-1">{s.val}</p>
            <p className={`text-[9px] font-bold ${s.up ? 'text-green-500' : 'text-red-500'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-[#1A1A2E] font-bold font-display text-base">Attendance Trend</h3>
               <p className="text-xs text-gray-500">Daily attendance percentage trend</p>
             </div>
             <select className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold px-2 py-1 rounded outline-none text-[#4B5563]">
                <option>This Month</option>
             </select>
           </div>
           <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <XAxis dataKey="name" tick={{fontSize: 9, fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} tickLine={false} axisLine={false} domain={[70, 100]} />
                  <Tooltip contentStyle={{fontSize: '10px', borderRadius: '8px'}} />
                  <Line type="monotone" dataKey="val" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-[#1A1A2E] font-bold font-display text-base">Department Overview</h3>
               <p className="text-xs text-gray-500">Attendance by department</p>
             </div>
             <select className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold px-2 py-1 rounded outline-none text-[#4B5563]">
                <option>This Month</option>
             </select>
           </div>
           <div className="space-y-4">
             {[
               {n:'Engineering', v:95.4, c:'#10B981'},
               {n:'Product', v:93.1, c:'#10B981'},
               {n:'Human Resources', v:91.2, c:'#10B981'},
               {n:'Sales', v:88.7, c:'#F59E0B'},
               {n:'Marketing', v:86.3, c:'#F59E0B'},
               {n:'Finance', v:89.9, c:'#10B981'},
             ].map(r => (
                <div key={r.n} className="flex items-center gap-3">
                  <div className="w-24 text-[10px] font-bold text-[#4B5563] truncate">{r.n}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{width: `${r.v}%`, backgroundColor: r.c}}></div>
                  </div>
                  <div className="w-8 text-right text-[10px] font-black text-[#1A1A2E]">{r.v}%</div>
                </div>
             ))}
           </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-[#1A1A2E] font-bold font-display text-base">Attendance by Location</h3>
               <p className="text-xs text-gray-500">Across different office locations</p>
             </div>
             <select className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold px-2 py-1 rounded outline-none text-[#4B5563]">
                <option>This Month</option>
             </select>
           </div>
           <div className="flex items-center">
             <div className="w-[140px] h-[140px] relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={donutData} innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                     {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-0">
                 <span className="text-[16px] font-extrabold text-[#1A1A2E] font-display">92.6%</span>
                 <span className="text-[8px] text-[#6B7280] font-semibold">Overall</span>
               </div>
             </div>
             <div className="flex-1 ml-4 space-y-3">
                 {donutData.map(d => (
                   <div key={d.name} className="flex justify-between items-center text-[10px]">
                     <span className="flex items-center gap-1.5 font-bold text-[#4B5563]"><div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div> {d.name} Office</span>
                     <span className="font-extrabold text-[#1A1A2E]">{(d.value*2).toFixed(1)}%</span>
                   </div>
                 ))}
             </div>
           </div>
        </div>
      </div>

      {/* BOTTOM DATA ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Employee Table */}
        <div className="lg:col-span-8 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
           <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-[#1A1A2E] font-bold font-display text-base">Employee Attendance Summary</h3>
               <p className="text-xs text-gray-500">Detailed view of employee attendance for the selected period</p>
             </div>
             <div className="flex gap-2">
               <input placeholder="Search employee..." className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs outline-none" />
               <select className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs outline-none"><option>All Departments</option></select>
               <select className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs outline-none"><option>All Locations</option></select>
             </div>
           </div>
           
           <div className="w-full relative overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Employee</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Department</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Total Days</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Present</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Absent</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">On Leave</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Late (Days)</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Avg. Late (mins)</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Attendance %</th>
                    <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-[#6B7280] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {[
                    {name:'Utkarsh Jha', d:'Management', t:22, p:20, a:0, l:2, lt:1, alt:12.5, pct:95.5, stat:'Excellent'},
                    {name:'Kartik Pandian', d:'Sales', t:22, p:18, a:1, l:3, lt:2, alt:18.2, pct:86.4, stat:'Good'},
                    {name:'Aakanksha Raut', d:'Product', t:22, p:19, a:0, l:3, lt:3, alt:22.1, pct:88.6, stat:'Good'},
                    {name:'Sonal Sharma', d:'Engineering', t:22, p:21, a:0, l:1, lt:1, alt:8.3, pct:95.5, stat:'Excellent'},
                    {name:'Pratima Maurya', d:'HR', t:22, p:20, a:1, l:1, lt:0, alt:5.7, pct:93.2, stat:'Excellent'},
                  ].map((r,i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">{r.name[0]}</div>
                           <p className="text-xs font-bold text-[#1A1A2E]">{r.name}</p>
                         </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-[#4B5563]">{r.d}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-center text-[#4B5563]">{r.t}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-center text-[#16A34A]">{r.p}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-center text-[#EF4444]">{r.a}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-center text-[#F59E0B]">{r.l}</td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-center text-[#4B5563]">{r.lt}</td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-center text-[#4B5563]">{r.alt}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-center text-[#1A1A2E]">{r.pct}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.stat==='Excellent'?'bg-[#DCFCE7] text-[#16A34A]':'bg-[#EFF6FF] text-[#3B82F6]'}`}>{r.stat}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Alerts & Insights */}
        <div className="lg:col-span-4 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
           <h3 className="text-[#1A1A2E] font-bold font-display text-base mb-4">Alerts & Insights</h3>
           <div className="space-y-4 mb-8">
             <div className="bg-[#FEF2F2] rounded-xl p-3 flex gap-3 border border-[#FEE2E2]">
               <span className="material-symbols-outlined text-[#EF4444] text-[20px]">error</span>
               <div>
                 <div className="flex justify-between items-center"><p className="text-xs font-extrabold text-[#991B1B]">High Absenteeism</p><span className="text-[10px] text-[#3B82F6] font-bold cursor-pointer hover:underline">View</span></div>
                 <p className="text-[10px] font-medium text-[#B91C1C] mt-0.5">Marketing dept. absenteeism is 14.2% higher than usual.</p>
               </div>
             </div>
             <div className="bg-[#FFFBEB] rounded-xl p-3 flex gap-3 border border-[#FEF3C7]">
               <span className="material-symbols-outlined text-[#D97706] text-[20px]">schedule</span>
               <div>
                 <div className="flex justify-between items-center"><p className="text-xs font-extrabold text-[#92400E]">Late Punch-ins</p><span className="text-[10px] text-[#3B82F6] font-bold cursor-pointer hover:underline">View</span></div>
                 <p className="text-[10px] font-medium text-[#B45309] mt-0.5">12 employees were late more than 30 mins on 10+ days.</p>
               </div>
             </div>
             <div className="bg-[#F0FDF4] rounded-xl p-3 flex gap-3 border border-[#DCFCE7]">
               <span className="material-symbols-outlined text-[#16A34A] text-[20px]">verified</span>
               <div>
                 <div className="flex justify-between items-center"><p className="text-xs font-extrabold text-[#166534]">Excellent Attendance</p><span className="text-[10px] text-[#3B82F6] font-bold cursor-pointer hover:underline">View</span></div>
                 <p className="text-[10px] font-medium text-[#15803D] mt-0.5">Engineering department maintained 95%+ attendance!</p>
               </div>
             </div>
           </div>

           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[#1A1A2E] font-bold font-display text-sm">Recent Activity</h3>
             <span className="text-[9px] text-[#3B82F6] font-bold cursor-pointer hover:underline">View All</span>
           </div>
           <div className="space-y-4">
              {[
                {t:'Geofence updated', d:'Delhi Office boundary modified by Admin', time:'2h ago'},
                {t:'New zone created', d:'Wave Office geofence added', time:'4h ago'},
                {t:'Report exported', d:'April 2025 report downloaded by CEO', time:'6h ago'},
              ].map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">description</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#1A1A2E]">{a.t}</p>
                    <p className="text-[9px] text-gray-500">{a.d}</p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 shrink-0">{a.time}</span>
                </div>
              ))}
           </div>
        </div>

      </div>

    </div>
  )
}
