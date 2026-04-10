import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/api/attendance'
import { leavesApi } from '@/api/leaves'
import { useAuthStore } from '@/store/auth'
import { formatTime } from '@/lib/utils'
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip
} from 'recharts'

export function AttendancePage() {
  const { employee } = useAuthStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', employee?.id, month, year],
    queryFn: () => attendanceApi.summary(employee?.id || '', month, year),
    enabled: !!employee,
  })

  const { data: todayAttn } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceApi.today(),
  })

  const { data: myBalanceRes } = useQuery({
    queryKey: ['dash-balance'],
    queryFn: () => leavesApi.myBalance()
  })

  const todayStr = "10:58 am Thursday, 10 Apr 2025" // Mock from screenshot

  const donutData = [
    { name: 'Present', value: 85, color: '#22C55E' },
    { name: 'Absent', value: 8, color: '#EF4444' },
    { name: 'On Leave', value: 4, color: '#F59E0B' },
    { name: 'Half Day', value: 3, color: '#8B5CF6' },
  ]

  const trendData = [
    { name: 'Jan', val: 5 }, { name: 'Feb', val: 7 }, { name: 'Mar', val: 10 },
    { name: 'Apr', val: 8 }, { name: 'May', val: 12 }, { name: 'Jun', val: 9 }
  ]

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-3xl p-8 relative flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFF0E5 0%, #FFDFCF 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.1)' }}>
        <div>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-display">Attendance & Leaves</h1>
          <p className="text-[#4B5563] text-sm">Track, manage and plan your time with ease.</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-4 border border-white">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500">Current Time</p>
            <p className="text-[16px] font-black text-[#1A1A2E] leading-tight">{todayStr}</p>
          </div>
        </div>
      </div>

      {/* TOP ROW STATS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { title: 'Attendance This Month', val: '22', max: '/26', sub: 'Days Present', trend: '↑ 84.6%', iconUrl: null, bg: '#F8FAFC' },
          { title: 'Leaves Balance', val: '18', max: '', sub: 'Days Available', trend: 'View Details →', link: true, bg: '#F0FDF4' },
          { title: 'Upcoming Leave', val: '2', max: ' Days', sub: 'Next: 15 - 16 Apr', trend: 'Casual Leave', tag: true, bg: '#FFFBEB' },
          { title: 'On Leave Today', val: '12', max: '', sub: 'Colleagues', trend: 'View List →', link: true, bg: '#F5F3FF' },
          { title: 'Late Arrivals', val: '3', max: '', sub: 'This Month', trend: '↓ 25% vs last month', redTrend: true, bg: '#FEF2F2' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
            <p className="text-xs font-bold text-[#1A1A2E] mb-3 font-display">{s.title}</p>
            <div className="flex items-baseline mb-1">
              <span className="text-3xl font-black text-[#1A1A2E]">{s.val}</span>
              <span className="text-xs font-semibold text-gray-500 ml-1">{s.max}</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mb-3">{s.sub}</p>
            {s.link && <p className="text-[10px] font-bold text-[#3B82F6] cursor-pointer hover:underline">{s.trend}</p>}
            {s.tag && <span className="text-[9px] font-bold text-[#F59E0B] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-sm">{s.trend}</span>}
            {!s.link && !s.tag && <p className={`text-[10px] font-bold ${s.redTrend ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>{s.trend}</p>}
          </div>
        ))}
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PUNCH IN OUT */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-sm">Punch In / Out</h3>
          </div>
          
          <div className="relative w-48 h-48 rounded-full border-[12px] border-[#EFF6FF] flex flex-col items-center justify-center mb-6 shadow-inner">
             {/* Progress ring mock */}
             <div className="absolute inset-0 rounded-full border-[12px] border-[#3B82F6] border-t-transparent border-r-transparent transform -rotate-45"></div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Punched In</p>
             <p className="text-2xl font-black text-[#1A1A2E] font-display">08:52 am</p>
             <p className="text-xs font-semibold text-gray-500">Today</p>
             <div className="absolute -bottom-3 bg-white px-3 py-1 rounded-full border border-[#E2E8F0] shadow-sm flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
               <span className="text-[10px] font-bold text-[#1A1A2E]">Within Time</span>
             </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-4">Work Hours: <span className="font-bold text-[#1A1A2E]">08h 06m</span></p>
          <button className="w-full bg-[#FFEDD5] hover:bg-[#FED7AA] text-[#C2410C] font-bold py-3 rounded-xl transition text-sm mb-3">
             Punch Out
          </button>
          <button className="text-[#3B82F6] text-xs font-bold hover:underline">View My Timesheet →</button>
        </div>

        {/* CALENDAR */}
        <div className="lg:col-span-6 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base">Attendance Calendar</h3>
            <button className="bg-[#F8FAFC] text-[#4B5563] text-xs font-semibold flex items-center px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
              Monthly View <span className="material-symbols-outlined text-[16px] ml-1">expand_more</span>
            </button>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <h4 className="font-bold text-lg text-[#1A1A2E]">April 2025</h4>
            <div className="flex gap-1">
              <button className="w-6 h-6 rounded bg-[#F1F5F9] text-gray-500 flex items-center justify-center shrink-0 hover:bg-gray-200"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
              <button className="w-6 h-6 rounded bg-[#F1F5F9] text-gray-500 flex items-center justify-center shrink-0 hover:bg-gray-200"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-4 mb-4">
             {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400">{d}</div>)}
             {/* Mock Calendar Grid */}
             {Array.from({length: 30}).map((_, i) => {
                const day = i + 1;
                // mock statuses like the screenshot
                let bg = '';
                let text = 'text-[#1A1A2E]';
                if ([1,2,3,4,7,8,9,14,15,16,17,21,22,23].includes(day)) { bg = 'bg-[#DCFCE7]'; text = 'text-[#16A34A]'; }
                else if (day === 10) { bg = 'bg-[#FEF3C7]'; text = 'text-[#D97706]'; }
                else if (day === 11 || day === 18) { bg = 'bg-[#E0E7FF]'; text = 'text-[#4338CA]'; }
                
                return (
                  <div key={i} className="flex justify-center">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${bg} ${text}`}>
                      {day}
                    </div>
                  </div>
                )
             })}
          </div>
        </div>

        {/* OVERVIEW */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-sm">Attendance Overview</h3>
          </div>
          <div className="flex justify-center mb-6 relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={donutData} innerRadius={55} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                  {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-2xl font-extrabold text-[#1A1A2E] font-display">85%</span>
              <span className="text-[10px] text-[#6B7280] font-semibold">Present</span>
            </div>
          </div>
          <div className="space-y-3 mt-4">
             {[{n:'Present',c:'#22C55E',v:22},{n:'Absent',c:'#EF4444',v:2},{n:'Half Day',c:'#F59E0B',v:1},{n:'On Leave',c:'#8B5CF6',v:1}].map((d, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-semibold">
                   <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2 h-2 rounded-full" style={{backgroundColor:d.c}}></div>{d.n}</div>
                   <div className="text-[#1A1A2E] font-bold">{d.v}</div>
                </div>
             ))}
          </div>
        </div>

      </div>

    </div>
  )
}
