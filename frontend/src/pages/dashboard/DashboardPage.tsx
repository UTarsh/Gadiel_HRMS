import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { employeesApi } from '@/api/employees'
import { attendanceApi } from '@/api/attendance'
import { leavesApi } from '@/api/leaves'
import { notificationsApi } from '@/api/notifications'
import { getInitials } from '@/lib/utils'
import { format } from 'date-fns'
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts'

export function DashboardPage() {
  const { employee } = useAuthStore()
  
  // Queries
  const { data: orgData } = useQuery({ queryKey: ['dash-org'], queryFn: () => employeesApi.orgChart() })
  const { data: myBalanceRes } = useQuery({ queryKey: ['dash-balance'], queryFn: () => leavesApi.myBalance() })
  const todayDate = new Date()
  const todayStr = format(todayDate, 'EEEE, dd MMMM yyyy')
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
  const daysPassed = todayDate.getDate()
  const daysLeft = daysInMonth - daysPassed
  const monthProgress = Math.round((daysPassed / daysInMonth) * 100)

  const { data: summaryRes } = useQuery({ queryKey: ['dash-att-summary', employee?.id, todayDate.getMonth()+1, todayDate.getFullYear()], queryFn: () => attendanceApi.summary(employee?.id || '', todayDate.getMonth()+1, todayDate.getFullYear()), enabled: !!employee?.id })
  const { data: notificationsRes } = useQuery({ queryKey: ['dash-notifications'], queryFn: () => notificationsApi.list() })
  const { data: employeesTodayRes } = useQuery({ queryKey: ['dash-att-admin'], queryFn: () => attendanceApi.todayAll() })
  
  const leaveData = myBalanceRes?.data?.data && Array.isArray(myBalanceRes.data.data) ? myBalanceRes.data.data[0] : null
  const summary = summaryRes?.data?.data
  const notifications = (notificationsRes?.data?.data as any) || []

  // Mock data for the specific visual elements (Ideally from API, mocked here for exact UI match)
  const sparklineData = Array.from({length: 15}, (_, i) => ({ val: 85 + Math.random() * 15 }))

  const donutData = [
    { name: 'Present', value: 1156, color: '#22C55E' },
    { name: 'Absent', value: 54, color: '#EF4444' },
    { name: 'On Leave', value: 38, color: '#F59E0B' },
    { name: 'Work From Home', value: 28, color: '#8B5CF6' },
    { name: 'Business Travel', value: 12, color: '#3B82F6' },
  ]

  return (
    <div className="space-y-6">
      
      {/* --- TOP ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Welcome Card */}
        <div className="lg:col-span-6 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #FFEBD1 0%, #FFD6C1 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.1)' }}>
          <div className="absolute right-0 top-0 w-64 h-full pointer-events-none opacity-40">
            {/* Simple sun / clouds css art */}
            <div className="absolute top-4 right-10 w-24 h-24 rounded-full bg-yellow-400 opacity-60"></div>
            <div className="absolute top-10 right-2 w-32 h-10 rounded-full bg-white opacity-80 backdrop-blur-md"></div>
          </div>
          <div className="p-8 relative z-10">
            <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-display">
              Good morning, {employee?.first_name || 'Utkarsh'}! 👋
            </h1>
            <p className="text-[#4B5563] text-sm mb-6">Let's make today a productive one.</p>
            <div className="inline-flex items-center bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold text-[#1A1A2E]">
              {todayStr}
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <h3 className="text-[#1A1A2E] font-bold font-display mb-4">Leave Balance</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#DCFCE7] rounded-2xl p-3 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#16A34A] text-xl mb-1">beach_access</span>
              <span className="text-xl font-bold text-[#1A1A2E] font-display leading-none">{(leaveData as any)?.earned_leave ?? 18}</span>
              <span className="text-[9px] text-[#4B5563] mt-1">Earned</span>
            </div>
            <div className="bg-[#FEE2E2] rounded-2xl p-3 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#DC2626] text-xl mb-1">favorite</span>
              <span className="text-xl font-bold text-[#1A1A2E] font-display leading-none">{(leaveData as any)?.sick_leave ?? 8}</span>
              <span className="text-[9px] text-[#4B5563] mt-1">Sick</span>
            </div>
            <div className="bg-[#DBEAFE] rounded-2xl p-3 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#2563EB] text-xl mb-1">local_cafe</span>
              <span className="text-xl font-bold text-[#1A1A2E] font-display leading-none">{(leaveData as any)?.casual_leave ?? 6}</span>
              <span className="text-[9px] text-[#4B5563] mt-1">Casual</span>
            </div>
            <div className="bg-[#F3E8FF] rounded-2xl p-3 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#9333EA] text-xl mb-1">pregnant_woman</span>
              <span className="text-xl font-bold text-[#1A1A2E] font-display leading-none">{(leaveData as any)?.maternity_leave ?? 60}</span>
              <span className="text-[9px] text-[#4B5563] mt-1">Maternity</span>
            </div>
          </div>
        </div>

        {/* Month Progress */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-20 transform rotate-12 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: '120px', color: '#F97316' }}>calendar_month</span>
          </div>
          <h3 className="text-[#1A1A2E] font-bold font-display mb-2 relative z-10">Month Progress</h3>
          <div className="relative z-10 mb-5">
            <span className="text-3xl font-extrabold text-[#1A1A2E] font-display">{daysLeft}</span>
            <span className="text-[#4B5563] text-xs font-semibold ml-2">Days to Month End</span>
          </div>
          <div className="w-full bg-[#FFEDE0] h-3 rounded-full mb-2 overflow-hidden relative z-10">
            <div className="bg-[#F97316] h-full rounded-full" style={{ width: `${monthProgress}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#6B7280] font-semibold relative z-10">
            <span>1 Apr - 30 Apr 2025</span>
            <span className="text-[#1A1A2E]">{monthProgress}% Completed</span>
          </div>
        </div>
      </div>

      {/* --- STATS ROW --- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Employees', val: '1,248', icon: 'groups', color: '#3B82F6', bg: '#EFF6FF', trend: '+5.4%' },
          { label: 'Present Today', val: summary?.present?.toString() || '1,156', icon: 'how_to_reg', color: '#22C55E', bg: '#F0FDF4', trend: '92.6%', trendColor: '#22C55E', isPct: true },
          { label: 'Absent Today', val: summary?.absent?.toString() || '54', icon: 'person_off', color: '#EF4444', bg: '#FEF2F2', trend: '4.3%', trendColor: '#EF4444', isPct: true },
          { label: 'On Leave', val: '38', icon: 'beach_access', color: '#F59E0B', bg: '#FFFBEB', trend: '3.1%', trendColor: '#F59E0B', isPct: true },
          { label: 'Late Arrivals', val: summary?.late?.toString() || '12', icon: 'schedule', color: '#EAB308', bg: '#FEF9C3', trend: '1.0%', trendColor: '#EAB308', isPct: true },
        ].map((s, idx) => (
          <div key={idx} className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                <span className="material-symbols-outlined" style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
            <h4 className="text-[#1A1A2E] font-extrabold text-2xl font-display">{s.val}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#6B7280] font-semibold">{s.label}</span>
              {!s.isPct && <span className="text-[10px] font-bold text-[#22C55E] flex items-center"><span className="material-symbols-outlined text-[12px] leading-none text-[#22C55E]">arrow_upward</span>{s.trend}</span>}
              {s.isPct && <span className="text-[10px] font-bold px-1.5 rounded-sm" style={{ backgroundColor: `${s.trendColor}1A`, color: s.trendColor }}>{s.trend}</span>}
            </div>
          </div>
        ))}
        {/* Avg Attendance Chart */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#6B7280] text-xs font-semibold">Avg. Attendance (MTD)</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="w-[80px] h-[40px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="val" stroke="#3B82F6" strokeWidth={2} fill="url(#colorUv)" />
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right">
              <h4 className="text-[#1A1A2E] font-extrabold text-2xl font-display">95.2%</h4>
              <span className="text-[10px] font-bold text-[#22C55E] flex items-center justify-end"><span className="material-symbols-outlined text-[12px] leading-none text-[#22C55E]">north_east</span>2.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- MIDDLE ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Org Chart (Mock visual replica) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[#1A1A2E] font-bold font-display text-lg">Organization Chart</h3>
            <button className="text-[#3B82F6] text-xs font-semibold flex items-center hover:underline">View Full Chart <span className="material-symbols-outlined text-[16px] ml-1">open_in_new</span></button>
          </div>
          
          <div className="flex flex-col items-center">
            {/* CEO */}
            <div className="bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 shadow-sm w-[220px]">
              <img src="https://i.pravatar.cc/100?img=11" className="w-10 h-10 rounded-full" alt="Amit Sharma" />
              <div>
                <p className="text-sm font-bold text-[#1A1A2E] font-display">Amit Sharma</p>
                <p className="text-[11px] font-medium text-[#6B7280]">CEO</p>
              </div>
            </div>
            <div className="w-[1.5px] h-6 bg-[#CBD5E1]"></div>
            
            {/* Dept Heads wrapper */}
            <div className="border-t-[1.5px] border-[#CBD5E1] w-[60%] h-0"></div>
            <div className="flex justify-between w-[80%] mt-6 relative">
              {[
                { name: 'Priya Mehta', role: 'Head of People', img: 'https://i.pravatar.cc/100?img=47' },
                { name: 'Rohan Verma', role: 'CTO', img: 'https://i.pravatar.cc/100?img=12' },
                { name: 'Neha Kapoor', role: 'Head of Finance', img: 'https://i.pravatar.cc/100?img=44' },
              ].map((p, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="absolute top-[-24px] w-[1.5px] h-6 bg-[#CBD5E1]"></div>
                  <div className="bg-white border-[1.5px] border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 shadow-sm w-[200px]">
                    <img src={p.img} className="w-10 h-10 rounded-full" alt={p.name} />
                    <div>
                      <p className="text-sm font-bold text-[#1A1A2E] font-display">{p.name}</p>
                      <p className="text-[11px] font-medium text-[#6B7280]">{p.role}</p>
                    </div>
                  </div>
                  <div className="w-[1.5px] h-6 bg-[#CBD5E1]"></div>
                </div>
              ))}
            </div>

            {/* Departments */}
            <div className="flex justify-between w-[95%] items-center mt-2">
              {[
                { name: 'HR Team', count: '12 Members', icon: 'groups', color: '#3B82F6', bg: '#EFF6FF' },
                { name: 'Engineering', count: '245 Members', icon: 'code', color: '#22C55E', bg: '#F0FDF4' },
                { name: 'Product', count: '34 Members', icon: 'inventory_2', color: '#8B5CF6', bg: '#F5F3FF' },
                { name: 'Finance', count: '16 Members', icon: 'monetization_on', color: '#F59E0B', bg: '#FFFBEB' },
              ].map((d, i) => (
                <div key={i} className="rounded-xl p-3 flex items-center gap-3 w-[180px]" style={{ backgroundColor: d.bg }}>
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${d.color}22` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: d.color }}>{d.icon}</span>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-[#1A1A2E]">{d.name}</p>
                     <p className="text-[10px] text-[#6B7280]">{d.count}</p>
                   </div>
                </div>
              ))}
            </div>
            
            <button className="mt-8 bg-[#F8FAFC] text-[#3B82F6] hover:bg-[#F1F5F9] font-bold text-xs py-2 px-6 rounded-full border border-[#E2E8F0] transition">
              + 6 More Departments
            </button>
          </div>
        </div>

        {/* Employee Status Overview */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-lg">Employee Status Overview</h3>
            <button className="bg-[#F8FAFC] text-[#4B5563] text-[11px] font-semibold flex items-center px-3 py-1.5 rounded-full border border-[#E2E8F0]">
              Today <span className="material-symbols-outlined text-[14px] ml-1">keyboard_arrow_down</span>
            </button>
          </div>
          
          <div className="flex justify-center mb-6 relative">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-[#1A1A2E] font-display">1,248</span>
              <span className="text-[10px] text-[#6B7280] font-semibold">Total</span>
            </div>
          </div>

          <div className="w-full">
            <div className="grid grid-cols-4 text-[#9CA3AF] text-[10px] font-bold uppercase mb-2 px-1">
              <div className="col-span-2">Status</div>
              <div className="text-right">Count</div>
              <div className="text-right">%</div>
            </div>
            {donutData.map((d, i) => (
              <div key={i} className="grid grid-cols-4 text-xs font-semibold py-2 px-1 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] rounded transition">
                <div className="col-span-2 flex items-center gap-2 text-[#1A1A2E]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                  {d.name}
                </div>
                <div className="text-right text-[#4B5563]">{d.value}</div>
                <div className="text-right text-[#6B7280]">{(d.value / 1248 * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* --- BOTTOM ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Who's in Today */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base">Who's In Today? <span className="text-[10px] text-[#6B7280] font-medium ml-1">(Live)</span></h3>
            <button className="text-[#3B82F6] text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="flex px-2 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative -ml-2 first:ml-0 transition-transform hover:-translate-y-1 hover:z-10 cursor-pointer">
                <img src={`https://i.pravatar.cc/100?img=${i+49}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Employee" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-white rounded-full"></div>
              </div>
            ))}
          </div>
          <h4 className="text-[#1A1A2E] font-bold text-xs mb-3">High Present Teams</h4>
          <div className="flex gap-2">
            <div className="bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5">Engineering <span className="bg-white px-1.5 rounded text-[#2563EB]">96%</span></div>
            <div className="bg-[#F0FDF4] text-[#16A34A] text-[11px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5">Product <span className="bg-white px-1.5 rounded text-[#16A34A]">94%</span></div>
            <div className="bg-[#FEF2F2] text-[#EF4444] text-[11px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5">HR <span className="bg-white px-1.5 rounded text-[#EF4444]">91%</span></div>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base">Recent Announcements</h3>
            <button className="text-[#3B82F6] text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {(notifications && notifications.length > 0) ? notifications.slice(0, 3).map((a: any, i: number) => {
              const isBirthday = a.reference_type === 'birthday_broadcast'
              return (
                <div key={a.id || i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: isBirthday ? '#F5F3FF' : '#EFF6FF' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isBirthday ? '#8B5CF6' : '#3B82F6' }}>
                      {isBirthday ? 'cake' : 'campaign'}
                    </span>
                  </div>
                  <div className="flex-1 mt-0.5">
                    <p className="text-sm font-bold text-[#1A1A2E] font-display">{a.title}</p>
                    <p className="text-[11px] text-[#6B7280]">{a.body}</p>
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] font-medium whitespace-nowrap mt-1">
                    {a.created_at ? format(new Date(a.created_at), 'MMM dd') : ''}
                  </div>
                </div>
              )
            }) : [
              { title: 'New Leave Policy Update', sub: 'Effective from May 1, 2025', time: '2 days ago', icon: 'article', iconColor: '#22C55E', iconBg: '#F0FDF4' },
              { title: 'Townhall Meeting', sub: 'Join us on April 15 at 10:00 AM IST', time: '3 days ago', icon: 'campaign', iconColor: '#3B82F6', iconBg: '#EFF6FF' },
              { title: 'Work From Anywhere Program', sub: 'Apply by April 20, 2025', time: '1 week ago', icon: 'language', iconColor: '#8B5CF6', iconBg: '#F5F3FF' },
            ].map((a, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: a.iconBg }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: a.iconColor }}>{a.icon}</span>
                </div>
                <div className="flex-1 mt-0.5">
                  <p className="text-sm font-bold text-[#1A1A2E] font-display">{a.title}</p>
                  <p className="text-[11px] text-[#6B7280]">{a.sub}</p>
                </div>
                <div className="text-[10px] text-[#9CA3AF] font-medium whitespace-nowrap mt-1">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-20px] opacity-10 pointer-events-none">
             {/* decorative cake/party bg placeholder */}
          </div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-[#1A1A2E] font-bold font-display text-base">Upcoming Birthdays</h3>
            <button className="text-[#3B82F6] text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4 relative z-10">
            {[
              { name: 'Priya Sharma', date: '12 Apr', dept: 'Marketing', img: 'https://i.pravatar.cc/100?img=47' },
              { name: 'Rohan Mehta', date: '14 Apr', dept: 'Engineering', img: 'https://i.pravatar.cc/100?img=12' },
              { name: 'Ananya Iyer', date: '16 Apr', dept: 'HR', img: 'https://i.pravatar.cc/100?img=20' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={b.img} className="w-10 h-10 rounded-full" alt={b.name} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1A1A2E] font-display">{b.name}</p>
                  <div className="flex gap-2 items-center text-[#6B7280] text-[11px]">
                    <span>{b.date}</span> <span className="w-1 h-1 bg-[#CBD5E1] rounded-full"></span> <span>{b.dept}</span>
                  </div>
                </div>
                <div className="text-[#EF4444] opacity-80">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cake</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
