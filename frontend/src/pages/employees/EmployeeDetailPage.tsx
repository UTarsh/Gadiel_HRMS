import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { RingChart } from '@/components/shared/RingChart'
import { profileApi, resolveAvatarUrl } from '@/api/profile'
import { leavesApi } from '@/api/leaves'
import { attendanceApi } from '@/api/attendance'
import { getInitials, capitalize } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRoleBadge(role: string | null | undefined) {
  switch (role) {
    case 'super_admin': return { label: 'Super Admin', bg: 'rgba(234,179,8,0.12)', color: '#92400e' }
    case 'hr_admin':    return { label: 'HR Admin',    bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' }
    case 'manager':     return { label: 'Manager',     bg: 'rgba(37,99,235,0.1)',  color: '#3B82F6' }
    default:            return { label: 'Employee',    bg: 'rgba(37,99,235,0.08)', color: '#2563EB' }
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: 'var(--c-t3)' }}>{children}</p>
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--c-border3)' }}>
      <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 mr-4" style={{ color: 'var(--c-t3)' }}>{label}</span>
      <span className="text-sm font-semibold text-right break-words" style={{ color: 'var(--c-t1)' }}>{value}</span>
    </div>
  )
}

function ExpandableCard({ icon, title, summary, isOpen, onToggle, children, accent = '#3B82F6' }: {
  icon: string; title: string; summary: React.ReactNode
  isOpen: boolean; onToggle: () => void; children: React.ReactNode; accent?: string
}) {
  return (
    <div className="card-kinetic overflow-hidden flex flex-col h-full">
      <button onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left group">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent + '18' }}>
          <span className="material-symbols-outlined" style={{ color: accent, fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold truncate" style={{ color: 'var(--c-t1)' }}>{title}</p>
          <div className="mt-0.5">{summary}</div>
        </div>
        <span className="material-symbols-outlined shrink-0 transition-all"
          style={{ color: 'var(--c-t3)', fontSize: '22px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 flex-1" style={{ borderTop: '1px solid var(--c-border3)' }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { employee: me } = useAuthStore()
  const isHrOrAdmin = me?.role === 'hr_admin' || me?.role === 'super_admin'
  const now = new Date()

  const [openCards, setOpenCards] = useState<Set<string>>(new Set())
  function toggleCard(k: string) {
    setOpenCards(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  }

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['employee-profile', id],
    queryFn: () => profileApi.getById(id!),
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

  const emp = profileData?.data?.data
  const p = emp?.profile ?? null
  const balances = balanceData?.data?.data ?? []
  const summary = summaryData?.data?.data

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-72 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: 'var(--c-t3)' }}>Employee not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold" style={{ color: '#F97316' }}>Go back</button>
      </div>
    )
  }

  const avatarUrl = resolveAvatarUrl(p?.ghibli_image_url || p?.avatar_url)
  const roleBadge = getRoleBadge(emp.role)
  const doj = emp.date_of_joining ?? null
  const skills: string[] = p?.skills ?? []
  const assets: any[] = (p?.assets ?? []) as any[]
  const certs: any[] = (p?.certifications ?? []) as any[]

  return (
    <div className="space-y-5 pb-6">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--c-surface)', color: '#F97316' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {isHrOrAdmin && (
          <button
            onClick={() => navigate(`/employees/${id}/edit`)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* ══ HERO CARD ══ */}
      <div className="card-kinetic p-6 lg:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Avatar */}
          <div className="shrink-0">
            <Avatar className="h-36 w-36 rounded-3xl border-4 shadow-xl" style={{ borderColor: 'var(--c-card)' }}>
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback
                className="text-4xl font-extrabold rounded-3xl"
                style={{ background: 'linear-gradient(135deg,#EA580C,#F97316)', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {getInitials(emp.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 w-full">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight break-words" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
              {emp.full_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                {p?.custom_title || emp.designation?.name || 'Team Member'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {emp.department && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>corporate_fare</span>
                  {emp.department.name}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: '#92400e' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>badge</span>
                {emp.emp_code}
              </span>
              {doj && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.07)', color: '#3B82F6' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                  Joined {new Date(doj).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {emp.work_location && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#c04a00' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>location_on</span>
                  {emp.work_location}
                </span>
              )}
            </div>

            <div className="my-5" style={{ borderTop: '1px solid var(--c-border3)' }} />

            {/* Bio */}
            {p?.bio && (
              <div className="mb-4">
                <SectionLabel>About</SectionLabel>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-t2)' }}>{p.bio}</p>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="mb-4">
                <SectionLabel>Skills & Expertise</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(tag => (
                    <span key={tag} className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {(p?.linkedin_url || p?.github_url || p?.coding_profile_url) && (
              <div className="mt-4">
                <SectionLabel>Connect & Build</SectionLabel>
                <div className="flex flex-wrap gap-3 mt-1 text-xs font-bold">
                  {p.linkedin_url && (
                    <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border hover:opacity-80 transition-opacity" style={{ color: '#0077b5', borderColor: 'var(--c-border3)' }}>
                      LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {p.github_url && (
                    <a href={p.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border hover:opacity-80 transition-opacity" style={{ color: 'var(--c-t1)', borderColor: 'var(--c-border3)' }}>
                      🐙 GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {p.coding_profile_url && (
                    <a href={p.coding_profile_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border hover:opacity-80 transition-opacity" style={{ color: '#3B82F6', borderColor: 'var(--c-border3)' }}>
                      💻 Profile <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ DETAIL CARDS ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Employment */}
        <ExpandableCard
          icon="work" title="Employment Details"
          summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{emp.designation?.name} · {emp.department?.name}</p>}
          isOpen={openCards.has('work')} onToggle={() => toggleCard('work')}
        >
          <div className="space-y-0.5 mt-[-10px]">
            <InfoRow label="Employee ID" value={emp.emp_code} />
            <InfoRow label="Email" value={emp.email} />
            <InfoRow label="Designation" value={emp.designation?.name} />
            <InfoRow label="Department" value={emp.department?.name} />
            <InfoRow label="Employment Type" value={capitalize(emp.employment_type?.replace(/_/g, ' ') ?? '')} />
            <InfoRow label="Joining Date" value={doj ? new Date(doj).toLocaleDateString('en-GB') : null} />
            <InfoRow label="Location" value={emp.work_location} />
          </div>
        </ExpandableCard>

        {/* Personal */}
        <ExpandableCard
          icon="person" title="Personal Details"
          summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{p?.phone || 'Personal information'}</p>}
          isOpen={openCards.has('personal')} onToggle={() => toggleCard('personal')} accent="#3B82F6"
        >
          <div className="space-y-0.5 mt-[-10px]">
            <InfoRow label="Contact" value={p?.phone} />
            <InfoRow label="Date of Birth" value={p?.birthday ? new Date(p.birthday).toLocaleDateString('en-GB') : null} />
            <InfoRow label="Blood Group" value={p?.blood_group} />
            <InfoRow label="Gender" value={p?.gender ? capitalize(p.gender) : null} />
            <InfoRow label="Place of Birth" value={p?.birthplace} />
            <InfoRow label="Guardian" value={p?.guardian_name} />
            <InfoRow label="Marital Status" value={p?.marital_status ? capitalize(p.marital_status) : null} />
          </div>
        </ExpandableCard>

        {/* Hardware */}
        <ExpandableCard
          icon="inventory_2" title="Company Hardware" accent="#8B5CF6"
          summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{assets.length} item(s) assigned</p>}
          isOpen={openCards.has('assets')} onToggle={() => toggleCard('assets')}
        >
          {assets.length === 0 ? (
            <p className="text-xs italic" style={{ color: 'var(--c-t4)' }}>No assets assigned</p>
          ) : (
            <div className="space-y-2.5">
              {assets.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'rgba(139,92,246,0.05)' }}>
                  <span className="text-xl shrink-0">{a.emoji ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{a.name}</p>
                    {a.serial && <p className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{a.serial}</p>}
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </ExpandableCard>
      </div>

      {/* ══ CERTIFICATIONS (if any) ══ */}
      {certs.length > 0 && (
        <div className="card-kinetic p-5">
          <p className="text-sm font-extrabold mb-4" style={{ color: 'var(--c-t1)' }}>Professional Certifications</p>
          <div className="space-y-3">
            {certs.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{c.name}</p>
                    <span className="text-[10px] font-bold ml-2 shrink-0" style={{ color: c.progress >= 100 ? '#16A34A' : '#F97316' }}>{c.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${c.progress}%`, background: c.progress >= 100 ? 'linear-gradient(135deg,#16A34A,#22C55E)' : 'linear-gradient(135deg,#EA580C,#F97316)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ LEAVE BALANCE ══ */}
      {balances.length > 0 && (
        <div className="card-kinetic overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-border3)' }}>
            <p className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>Leave Balance</p>
          </div>
          {balances.map((b: any, idx: number) => (
            <div key={b.id} className="px-5 py-4" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--c-border3)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold" style={{ color: 'var(--c-t1)' }}>{b.leave_type.code}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--c-t3)' }}>{b.leave_type.name}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--c-t1)' }}>
                  {Number(b.available).toFixed(1)}
                  <span className="font-normal" style={{ color: 'var(--c-t3)' }}> / {Number(b.total_entitled).toFixed(0)}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(100, (Number(b.available) / Math.max(Number(b.total_entitled), 1)) * 100)}%`,
                  background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
                }} />
              </div>
              <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--c-t3)' }}>
                <span>Used: {Number(b.used).toFixed(1)}</span>
                <span>Pending: {Number(b.pending).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ATTENDANCE SUMMARY ══ */}
      {summary && (
        <div className="card-kinetic p-5">
          <p className="text-sm font-extrabold mb-5" style={{ color: 'var(--c-t1)' }}>
            Attendance — {new Date(summary.year, summary.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-6 mb-5">
            <RingChart value={summary.attendance_percentage} size={88} strokeWidth={8} color="#F97316" trackColor="var(--c-surface)">
              <span className="text-base font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
                {summary.attendance_percentage.toFixed(0)}%
              </span>
            </RingChart>
            <div>
              <p className="text-3xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
                {summary.attendance_percentage.toFixed(0)}%
              </p>
              <p className="text-sm" style={{ color: 'var(--c-t3)' }}>Attendance Rate</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Present',  value: summary.present,   bg: 'rgba(34,197,94,0.08)',   color: '#16A34A' },
              { label: 'Late',     value: summary.late,      bg: 'rgba(234,179,8,0.08)',   color: '#B45309' },
              { label: 'Absent',   value: summary.absent,    bg: 'rgba(239,68,68,0.08)',   color: '#DC2626' },
              { label: 'Half Day', value: summary.half_day,  bg: 'rgba(249,115,22,0.08)', color: '#EA580C' },
              { label: 'WFH',      value: summary.wfh,       bg: 'rgba(139,92,246,0.08)', color: '#7C3AED' },
              { label: 'On Leave', value: summary.on_leave,  bg: 'rgba(59,130,246,0.08)', color: '#2563EB' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-2xl" style={{ backgroundColor: s.bg }}>
                <p className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
