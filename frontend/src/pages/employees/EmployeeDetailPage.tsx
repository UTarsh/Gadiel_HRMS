import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, User, Pencil } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { RingChart } from '@/components/shared/RingChart'
import { employeesApi } from '@/api/employees'
import { leavesApi } from '@/api/leaves'
import { attendanceApi } from '@/api/attendance'
import { getInitials, formatDate, capitalize } from '@/lib/utils'

const roleChip: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
  hr_admin:    { bg: '#EFF6FF',               color: '#3B82F6' },
  manager:     { bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
  employee:    { bg: '#EFF6FF',               color: '#1E293B' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div
      className="flex justify-between items-center py-2.5"
      style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}
    >
      <span className="text-sm" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm font-semibold text-right max-w-[60%]" style={{ color: '#1E293B' }}>{value}</span>
    </div>
  )
}

type TabKey = 'overview' | 'leave' | 'attendance'

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { employee: me } = useAuthStore()
  const isHrOrAdmin = me?.role === 'hr_admin' || me?.role === 'super_admin'
  const now = new Date()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  })

  const { data: balanceData } = useQuery({
    queryKey: ['leave-balance', id],
    queryFn: () => leavesApi.employeeBalance(id!),
    enabled: !!id,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', id, now.getMonth() + 1, now.getFullYear()],
    queryFn: () => attendanceApi.summary(id!, now.getMonth() + 1, now.getFullYear()),
    enabled: !!id,
  })

  const emp = empData?.data?.data
  const balances = balanceData?.data?.data ?? []
  const summary = summaryData?.data?.data

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto animate-fade-up">
        <Skeleton className="h-8 w-20 rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: '#94A3B8' }}>Employee not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sm font-semibold"
          style={{ color: '#3B82F6' }}
        >
          Go back home
        </button>
      </div>
    )
  }

  const role = roleChip[emp.role] ?? { bg: '#EFF6FF', color: '#94A3B8' }
  const isActive = emp.employment_status === 'active'

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'leave', label: 'Leaves' },
    { key: 'attendance', label: 'Attendance' },
  ]

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-up">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {isHrOrAdmin && (
          <button
            onClick={() => navigate(`/employees/${id}/edit`)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* Profile card */}
      <div className="card-kinetic overflow-hidden">
        {/* Hero */}
        <div
          className="relative h-32 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
        >
          <div
            className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #DBEAFE, transparent)' }}
          />
          <div
            className="absolute bottom-[-40px] left-[-20px] w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #fff, transparent)' }}
          />
        </div>

        {/* Avatar + info */}
        <div className="px-5 pb-6 -mt-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <Avatar className="h-20 w-20 shrink-0 border-4 border-white shadow-xl">
              <AvatarImage src={emp.profile_picture_url || undefined} />
              <AvatarFallback
                className="text-white text-2xl font-extrabold"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {getInitials(emp.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1 flex-1 min-w-0 w-full">
              <h1
                className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}
              >
                {emp.full_name}
              </h1>
              <p className="text-xs font-semibold mt-0.5 tracking-wide" style={{ color: '#94A3B8' }}>{emp.emp_code}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <span
              className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider"
              style={{ backgroundColor: role.bg, color: role.color }}
            >
              {capitalize((emp.role || 'employee').replace('_', ' '))}
            </span>
            {emp.department && (
              <span
                className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider"
                style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
              >
                {emp.department.name}
              </span>
            )}
            {emp.designation && (
              <span
                className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider"
                style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }}
              >
                {emp.designation.name}
              </span>
            )}
            <span
              className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider"
              style={isActive
                ? { backgroundColor: 'rgba(34,197,94,0.1)', color: '#16A34A' }
                : { backgroundColor: '#F1F5F9', color: '#94A3B8' }
              }
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(226,232,240,0.8)' }}
          >
            {emp.email && (
              <a
                href={`mailto:${emp.email}`}
                className="flex items-center gap-2.5 text-sm transition-colors"
                style={{ color: '#475569' }}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EFF6FF' }}
                >
                  <Mail className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                </div>
                <span className="truncate text-xs">{emp.email}</span>
              </a>
            )}
            {emp.phone && (
              <a
                href={`tel:${emp.phone}`}
                className="flex items-center gap-2.5 text-sm transition-colors"
                style={{ color: '#475569' }}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                </div>
                <span className="text-xs">{emp.phone}</span>
              </a>
            )}
            {emp.work_location && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: '#475569' }}>
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                </div>
                <span className="text-xs">{emp.work_location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom pill tabs */}
      <div className="flex rounded-full p-1 gap-1" style={{ backgroundColor: '#EFF6FF' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 text-xs font-semibold py-2 rounded-full transition-all"
            style={activeTab === tab.key
              ? { background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#fff' }
              : { color: '#94A3B8' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="card-kinetic p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
                <Briefcase className="w-4 h-4" style={{ color: '#2563EB' }} />
              </div>
              <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}>
                Organisation
              </h3>
            </div>
            <InfoRow label="Employee Code" value={emp.emp_code} />
            <InfoRow label="Department" value={emp.department?.name} />
            <InfoRow label="Designation" value={emp.designation?.name} />
            <InfoRow label="Employment Type" value={capitalize(emp.employment_type?.replace('_', ' ') ?? '')} />
            <InfoRow label="Date of Joining" value={emp.date_of_joining ? formatDate(emp.date_of_joining) : undefined} />
            <InfoRow label="Work Location" value={emp.work_location} />
          </div>

          <div className="card-kinetic p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                <User className="w-4 h-4" style={{ color: '#3B82F6' }} />
              </div>
              <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}>
                Personal
              </h3>
            </div>
            <InfoRow label="Gender" value={capitalize(emp.gender ?? '')} />
            <InfoRow label="Date of Birth" value={emp.date_of_birth ? formatDate(emp.date_of_birth) : undefined} />
            <InfoRow label="Blood Group" value={emp.blood_group} />
            <InfoRow label="Marital Status" value={capitalize(emp.marital_status ?? '')} />
            {(emp as any).emergency_contact_name && (
              <InfoRow
                label="Emergency Contact"
                value={`${(emp as any).emergency_contact_name} (${(emp as any).emergency_contact_relation || 'relation'})`}
              />
            )}
            {(emp as any).emergency_contact_phone && (
              <InfoRow label="Emergency Phone" value={(emp as any).emergency_contact_phone} />
            )}
          </div>
        </div>
      )}

      {/* Leave tab */}
      {activeTab === 'leave' && (
        balances.length === 0 ? (
          <div className="card-kinetic p-8 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>No leave balances found.</p>
          </div>
        ) : (
          <div className="card-kinetic overflow-hidden">
            {balances.map((b, idx) => (
              <div
                key={b.id}
                className="px-5 py-4"
                style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(226,232,240,0.8)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold" style={{ color: '#1E293B' }}>{b.leave_type.code}</span>
                    <span className="text-xs ml-2" style={{ color: '#94A3B8' }}>{b.leave_type.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#1E293B' }}>
                    {Number(b.available).toFixed(1)}
                    <span className="font-normal" style={{ color: '#94A3B8' }}> / {Number(b.total_entitled).toFixed(0)}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EFF6FF' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (Number(b.available) / Math.max(Number(b.total_entitled), 1)) * 100)}%`,
                      background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1.5" style={{ color: '#94A3B8' }}>
                  <span>Used: {Number(b.used).toFixed(1)}</span>
                  <span>Pending: {Number(b.pending).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Attendance tab */}
      {activeTab === 'attendance' && (
        summary ? (
          <div className="card-kinetic p-5">
            <p
              className="text-[10px] font-bold uppercase tracking-wide mb-5"
              style={{ color: '#94A3B8' }}
            >
              {new Date(summary.year, summary.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-6 mb-5">
              <RingChart value={summary.attendance_percentage} size={88} strokeWidth={8} color="#3B82F6" trackColor="#EFF6FF">
                <span
                  className="text-base font-extrabold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}
                >
                  {summary.attendance_percentage.toFixed(0)}%
                </span>
              </RingChart>
              <div>
                <p
                  className="text-3xl font-extrabold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}
                >
                  {summary.attendance_percentage.toFixed(0)}%
                </p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>Attendance Rate</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Present',  value: summary.present,  bg: 'rgba(37,99,235,0.1)',    color: '#2563EB' },
                { label: 'Absent',   value: summary.absent,   bg: 'rgba(186,26,26,0.08)',   color: '#ba1a1a' },
                { label: 'Late',     value: summary.late,     bg: 'rgba(37,99,235,0.1)',    color: '#2563EB' },
                { label: 'Half Day', value: summary.half_day, bg: 'rgba(59,130,246,0.1)',   color: '#3B82F6' },
                { label: 'WFH',      value: summary.wfh,      bg: '#EFF6FF',                color: '#3B82F6' },
                { label: 'On Leave', value: summary.on_leave, bg: '#DBEAFE',                color: '#1E293B' },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-2xl" style={{ backgroundColor: s.bg }}>
                  <p
                    className="text-xl font-extrabold"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-kinetic p-8 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>No attendance data for this month.</p>
          </div>
        )
      )}
    </div>
  )
}
