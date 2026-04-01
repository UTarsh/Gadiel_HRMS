import { useState, useRef, type ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Check, X, Plus, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { profileApi, resolveAvatarUrl } from '@/api/profile'
import type { UserProfile, CertItem, BadgeItem, AssetItem } from '@/api/profile'
import { getInitials, capitalize } from '@/lib/utils'
import { toast } from 'sonner'
import { AdjustableImageUpload } from '@/components/shared/AdjustableImageUpload'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function daysUntilNext(monthDay: { month: number; day: number }): number {
  const now = new Date()
  const next = new Date(now.getFullYear(), monthDay.month, monthDay.day)
  if (next <= now) next.setFullYear(next.getFullYear() + 1)
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000)
}

function daysUntilFriday() {
  const day = new Date().getDay()
  return day <= 5 ? 5 - day : 7 - day + 5
}

function daysUntilBirthday(birthdayStr: string | null | undefined): number | null {
  if (!birthdayStr) return null
  const b = new Date(birthdayStr)
  if (isNaN(b.getTime())) return null
  return daysUntilNext({ month: b.getMonth(), day: b.getDate() })
}

function detectAssetEmoji(name: string): string {
  const l = name.toLowerCase()
  if (l.includes('laptop') || l.includes('macbook')) return '💻'
  if (l.includes('charger') || l.includes('adapter')) return '🔌'
  if (l.includes('bag') || l.includes('backpack')) return '🎒'
  if (l.includes('mouse')) return '🖱️'
  if (l.includes('keyboard')) return '⌨️'
  if (l.includes('monitor') || l.includes('display') || l.includes('screen')) return '🖥️'
  if (l.includes('headphone') || l.includes('headset') || l.includes('earphone') || l.includes('earbud')) return '🎧'
  if (l.includes('phone') || l.includes('mobile')) return '📱'
  if (l.includes('tablet') || l.includes('ipad')) return '📲'
  if (l.includes('cable') || l.includes('usb') || l.includes('hdmi') || l.includes('hub') || l.includes('dock')) return '🔌'
  if (l.includes('camera') || l.includes('webcam')) return '📷'
  if (l.includes('chair') || l.includes('desk')) return '🪑'
  if (l.includes('pen') || l.includes('stylus')) return '✏️'
  return '📦'
}

function normalizeAsset(a: Record<string, unknown>): AssetItem {
  const name = (a.name ?? a.nickname ?? 'Asset') as string
  return { name, serial: (a.serial ?? a.code ?? '') as string, emoji: (a.emoji ?? detectAssetEmoji(name)) as string, status: (a.status ?? 'Active') as string }
}

function normalizeCert(c: Record<string, unknown>): CertItem {
  return { name: (c.name ?? '') as string, issuer: c.issuer as string | undefined, progress: typeof c.progress === 'number' ? c.progress : (c.earned ? 100 : 0), badge_url: c.badge_url as string | undefined }
}

function getRoleBadge(role: string | null | undefined) {
  switch (role) {
    case 'super_admin': return { label: 'Super Admin', bg: 'var(--c-surface)', color: '#8b7c00' }
    case 'hr_admin':    return { label: 'HR Admin',    bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' }
    case 'manager':     return { label: 'Manager',     bg: 'var(--c-surface)', color: '#3B82F6' }
    default:            return { label: 'Employee',    bg: 'rgba(37,99,235,0.08)', color: '#2563EB' }
  }
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: 'var(--c-t3)' }}>{children}</p>
}

function InfoRow({ label, value, placeholder, editing, onChange, type = 'text' }: {
  label: string; value?: string | null; placeholder?: string; editing: boolean; onChange?: (v: string) => void; type?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--c-border3)' }}>
      <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 mr-4" style={{ color: 'var(--c-t3)' }}>{label}</span>
      {editing ? (
        <input type={type} defaultValue={value ?? ''} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder ?? label} className="text-sm font-semibold text-right bg-transparent border-b outline-none w-full"
          style={{ color: 'var(--c-t1)', borderColor: 'rgba(59,130,246,0.3)' }} />
      ) : (
        <span className="text-sm font-semibold text-right break-words" style={{ color: value ? 'var(--c-t1)' : 'var(--c-t4)' }}>{value || '—'}</span>
      )}
    </div>
  )
}

function TagList({ tags, editing, onAdd, onRemove, placeholder }: {
  tags: string[]; editing: boolean; onAdd: (t: string) => void; onRemove: (i: number) => void; placeholder: string
}) {
  const [input, setInput] = useState('')
  const add = () => { const t = input.trim(); if (t && !tags.includes(t)) { onAdd(t); setInput('') } }
  if (!editing && tags.length === 0) return <span className="text-xs italic" style={{ color: 'var(--c-t4)' }}>{placeholder}</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span key={tag} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}>
          {tag}
          {editing && <button onClick={() => onRemove(i)} className="hover:opacity-70"><X className="w-2.5 h-2.5" /></button>}
        </span>
      ))}
      {editing && (
        <div className="flex items-center gap-1">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add…" className="text-[11px] px-2 py-1 rounded-full border outline-none w-20"
            style={{ borderColor: 'rgba(59,130,246,0.3)', color: 'var(--c-t1)' }} />
          <button onClick={add} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--c-surface)' }}>
            <Plus className="w-2.5 h-2.5" style={{ color: '#3B82F6' }} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Collapsible card with a summary header and expandable body */
function ExpandableCard({ icon, title, summary, badge, isOpen, onToggle, children, accent = '#3B82F6' }: {
  icon: string; title: string; summary: React.ReactNode; badge?: React.ReactNode
  isOpen: boolean; onToggle: () => void; children: React.ReactNode; accent?: string
}) {
  return (
    <div className="card-kinetic overflow-hidden flex flex-col h-full">
      <button onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left group">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent + '18' }}>
          <span className="material-symbols-outlined" style={{ color: accent, fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-extrabold truncate" style={{ color: 'var(--c-t1)' }}>{title}</p>
            {badge}
          </div>
          <div className="mt-0.5">{summary}</div>
        </div>
        <span className="material-symbols-outlined shrink-0 group-hover:opacity-70 transition-all"
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

/** Small stat chip used in journey tracker */
function JourneyTile({ value, label, sub, style }: { value: React.ReactNode; label: string; sub?: string; style?: React.CSSProperties }) {
  return (
    <div className="rounded-2xl p-4 text-center h-full flex flex-col justify-center" style={style}>
      <p className="text-3xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className="text-[10px] font-bold mt-1 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[9px] mt-0.5 italic opacity-70">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfilePage() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<UserProfile>>({})
  const [openCards, setOpenCards] = useState<Set<string>>(new Set(['personal'])) // Default open some
  const [avatarTs, setAvatarTs] = useState(0)

  // Asset add form
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetDraft, setAssetDraft] = useState({ name: '', serial: '', status: 'Active' })

  // Cert add form
  const [showCertForm, setShowCertForm] = useState(false)
  const [certDraft, setCertDraft] = useState({ name: '', progress: 0, badge_url: '' })

  const { data, error, isError, isLoading } = useQuery({ queryKey: ['my-extended-profile'], queryFn: () => profileApi.getMe() })
  const emp = data?.data?.data
  const profile = emp?.profile ?? null
  const p = { ...profile, ...draft }

  const saveMutation = useMutation({
    mutationFn: () => profileApi.update(draft),
    onSuccess: () => {
      toast.success('Profile saved!')
      qc.invalidateQueries({ queryKey: ['my-extended-profile'] })
      setEditing(false)
      setDraft({})
      setShowAssetForm(false)
      setShowCertForm(false)
    },
    onError: () => toast.error('Failed to save profile'),
  })

  function field<K extends keyof UserProfile>(key: K) {
    return (v: UserProfile[K]) => setDraft(d => ({ ...d, [key]: v }))
  }

  function toggleCard(id: string) {
    setOpenCards(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function startEdit() {
    setEditing(true)
    setOpenCards(prev => new Set([...prev, 'personal', 'assets', 'certs']))
  }

  function cancelEdit() { setEditing(false); setDraft({}); setShowAssetForm(false); setShowCertForm(false) }

  async function handleAvatarChange(input: File | ChangeEvent<HTMLInputElement>) {
    const file = input instanceof File ? input : input.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB')
      return
    }
    try {
      await profileApi.uploadAvatar(file)
      setAvatarTs(Date.now())
      toast.success('Photo updated!')
      qc.invalidateQueries({ queryKey: ['my-extended-profile'] })
    } catch {
      toast.error('Upload failed')
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
      </div>
      <Skeleton className="h-36 rounded-3xl" />
    </div>
  )
  if (isError) {
    const message = (error as any)?.response?.data?.message || 'Failed to load your profile.'
    return (
      <div className="rounded-3xl border p-8 text-center" style={{ backgroundColor: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <p className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>Profile unavailable</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--c-t3)' }}>{message}</p>
      </div>
    )
  }
  if (!emp) return null

  const avatarUrl = resolveAvatarUrl(p.avatar_url, avatarTs || undefined)
  const rawBadges: BadgeItem[] = (p.badges ?? []) as BadgeItem[]
  const rawCerts: CertItem[] = ((p.certifications ?? []) as unknown as Record<string, unknown>[]).map(normalizeCert)
  const rawAssets: AssetItem[] = ((p.assets ?? []) as unknown as Record<string, unknown>[]).map(normalizeAsset)
  const skills: string[] = p.skills ?? []
  const interests: string[] = p.interests ?? []

  const doj = emp.date_of_joining ?? null
  const gadielDays = doj ? daysSince(doj) : null
  const anniversaryDays = doj ? daysUntilNext({ month: new Date(doj).getMonth(), day: new Date(doj).getDate() }) : null
  const survivedMondays = gadielDays != null ? Math.floor(gadielDays / 7) : 0
  const fridayDays = daysUntilFriday()
  const birthdayDays = daysUntilBirthday(p.birthday)

  const roleBadge = getRoleBadge(emp.role)
  const deptName = emp.department?.name?.toLowerCase() ?? ''
  const isITDept = deptName.includes('it') || deptName.includes('consultancy')

  // Auto-badges
  const veteranEarned = gadielDays !== null && gadielDays >= 365
  const completedCertsCount = rawCerts.filter(c => c.progress >= 100).length
  const autoBadges: BadgeItem[] = [
    { name: 'Veteran', desc: veteranEarned ? `${Math.floor(gadielDays! / 365)}+ yr at Gadiel` : '1+ year at Gadiel', icon: 'workspace_premium', earned: veteranEarned },
    { name: 'Cert Champ', desc: completedCertsCount >= 10 ? `${completedCertsCount} certs done!` : `${completedCertsCount}/10 certs`, icon: 'emoji_events', earned: completedCertsCount >= 10 },
  ]
  const earnedBadgeCount = autoBadges.filter(b => b.earned).length + rawBadges.filter(b => b.earned).length
  const totalBadgeCount = autoBadges.length + rawBadges.length

  // ── Handlers ──────────────────────────────────────────────────────────
  function addAsset() {
    if (!assetDraft.name.trim()) return
    field('assets')([...rawAssets, { name: assetDraft.name.trim(), serial: assetDraft.serial.trim(), emoji: detectAssetEmoji(assetDraft.name), status: assetDraft.status }])
    setAssetDraft({ name: '', serial: '', status: 'Active' })
    setShowAssetForm(false)
  }

  function addCert() {
    if (!certDraft.name.trim()) return
    field('certifications')([...rawCerts, { name: certDraft.name.trim(), progress: certDraft.progress, badge_url: certDraft.badge_url.trim() || undefined }])
    setCertDraft({ name: '', progress: 0, badge_url: '' })
    setShowCertForm(false)
  }

  function updateCert(i: number, updates: Partial<CertItem>) {
    field('certifications')(rawCerts.map((c, idx) => idx === i ? { ...c, ...updates } : c))
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* ══════════════════════════════════════════════════════════════════════
          HERO CARD — full-width, horizontal
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="card-kinetic p-6 lg:p-8 relative overflow-hidden">
        {/* Decorative branding for consistency */}
        <img
          src="/gadiel_logo.png"
          alt="Gadiel"
          className="absolute top-6 right-6 lg:top-8 lg:right-8 opacity-15 pointer-events-none"
          style={{ height: 32, objectFit: 'contain' }}
        />
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Avatar column */}
          <AdjustableImageUpload
            currentUrl={avatarUrl}
            alt={emp.full_name}
            frameSize={208}
            caption="Click to update photo"
            title="Update profile photo"
            description="Use the sliders to center the photo before uploading. The raw image is saved as you adjust it."
            confirmLabel="Save Photo"
            onUpload={handleAvatarChange}
          />

          {/* Info column */}
          <div className="flex-1 min-w-0 w-full">
            {/* Name row + Edit button */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight break-words" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
                  {emp.full_name}
                </h1>
                {/* Designation badge (editable) + role chip */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {editing ? (
                    <input
                      defaultValue={p.custom_title ?? emp.designation?.name ?? ''}
                      onChange={(e) => field('custom_title')(e.target.value)}
                      placeholder={emp.designation?.name ?? 'Your job title'}
                      className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white outline-none border-none w-full max-w-[224px]"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', caretColor: '#fff' }}
                    />
                  ) : (
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white break-words max-w-full"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
                      {p.custom_title || emp.designation?.name || 'Set your title'}
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}>
                    {roleBadge.label}
                  </span>
                </div>
              </div>

              {/* Edit / Save / Cancel */}
              <div className="flex gap-2 shrink-0">
                {editing ? (
                  <>
                    <button onClick={cancelEdit}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t3)' }}>
                      <X className="w-3 h-3" /> Cancel
                    </button>
                    <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full text-white hover:opacity-90 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
                      {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button onClick={startEdit}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
                    style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}>
                    <Pencil className="w-3 h-3" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Meta chips: dept, code, joined */}
            <div className="flex flex-wrap gap-2 mt-4">
              {emp.department && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>corporate_fare</span>
                  {emp.department.name}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--c-surface)', color: '#8b7c00' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>badge</span>
                {emp.emp_code}
              </span>
              {doj && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(59,130,246,0.07)', color: '#3B82F6' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                  Joined {new Date(doj).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {emp.work_location && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,148,110,0.1)', color: '#c04a00' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>location_on</span>
                  {emp.work_location}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="my-5" style={{ borderTop: '1px solid var(--c-border3)' }} />

            {/* Bio */}
            <div className="mb-4">
              <SectionLabel>About Me</SectionLabel>
              {editing ? (
                <textarea defaultValue={p.bio ?? ''} onChange={(e) => field('bio')(e.target.value)}
                  placeholder="Write a short bio about yourself…" rows={2}
                  className="w-full text-sm rounded-2xl px-4 py-2.5 resize-none outline-none border focus:ring-1 focus:ring-blue-400"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', color: 'var(--c-t1)', backgroundColor: 'var(--c-input)' }} />
              ) : (
                <p className="text-sm leading-relaxed break-words" style={{ color: p.bio ? 'var(--c-t2)' : 'var(--c-t4)' }}>
                  {p.bio || 'Tell your team a bit about yourself…'}
                </p>
              )}
            </div>

            {/* Skills */}
            <div className="mb-4">
              <SectionLabel>Skills & Expertise</SectionLabel>
              <TagList tags={skills} editing={editing}
                onAdd={(t) => field('skills')([...skills, t])}
                onRemove={(i) => field('skills')(skills.filter((_, idx) => idx !== i))}
                placeholder="Add your top skills" />
            </div>

            {/* Social & Coding links */}
            {(editing || p.linkedin_url || p.github_url || p.coding_profile_url) && (
              <div className="mt-4">
                <SectionLabel>Connect{isITDept ? ' & Build' : ''}</SectionLabel>
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined shrink-0" style={{ color: '#0077b5', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>link</span>
                      <input defaultValue={p.linkedin_url ?? ''} onChange={(e) => field('linkedin_url')(e.target.value)}
                        placeholder="LinkedIn Profile URL" className="text-xs w-full border-b outline-none bg-transparent"
                        style={{ color: 'var(--c-t1)', borderColor: 'rgba(59,130,246,0.3)' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] shrink-0 leading-none">🐙</span>
                      <input defaultValue={p.github_url ?? ''} onChange={(e) => field('github_url')(e.target.value)}
                        placeholder="GitHub Profile URL" className="text-xs w-full border-b outline-none bg-transparent"
                        style={{ color: 'var(--c-t1)', borderColor: 'rgba(59,130,246,0.3)' }} />
                    </div>
                    {isITDept && (
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] shrink-0 leading-none">💻</span>
                        <input defaultValue={p.coding_profile_url ?? ''} onChange={(e) => field('coding_profile_url')(e.target.value)}
                          placeholder="Coding Profile (LeetCode etc.)" className="text-xs w-full border-b outline-none bg-transparent"
                          style={{ color: 'var(--c-t1)', borderColor: 'rgba(59,130,246,0.3)' }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 mt-1 text-xs font-bold">
                    {p.linkedin_url && (
                      <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border hover:bg-white transition-colors" style={{ color: '#0077b5' }}>
                        LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border hover:bg-white transition-colors" style={{ color: '#1B1F23' }}>
                        🐙 GitHub <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {isITDept && p.coding_profile_url && (
                      <a href={p.coding_profile_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border hover:bg-white transition-colors" style={{ color: '#3B82F6' }}>
                        💻 Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENT GRID
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Work info */}
        <ExpandableCard 
          icon="work" title="Employment Details" badge={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>{capitalize(emp.employment_type?.replace(/_/g,' ') ?? 'Full-time')}</span>}
          isOpen={openCards.has('work')} onToggle={() => toggleCard('work')}
          summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{emp.designation?.name} · {emp.department?.name}</p>}
        >
          <div className="space-y-0.5 mt-[-10px]">
             <InfoRow label="Employee ID" value={emp.emp_code} editing={false} />
             <InfoRow label="Email" value={emp.email} editing={false} />
             <InfoRow label="Designation" value={emp.designation?.name} editing={false} />
             <InfoRow label="Department" value={emp.department?.name} editing={false} />
             <InfoRow label="Joining Date" value={doj ? new Date(doj).toLocaleDateString('en-GB') : '—'} editing={false} />
             <InfoRow label="Location" value={emp.work_location} editing={false} />
             <InfoRow label="Role Type" value={capitalize(emp.role?.replace(/_/g,' ') ?? 'Employee')} editing={false} />
          </div>
        </ExpandableCard>

        {/* Personal info */}
        <ExpandableCard 
          icon="person" title="Personal Details" summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{p.phone || 'Manage your privacy'}</p>}
          isOpen={openCards.has('personal')} onToggle={() => toggleCard('personal')} accent="#3B82F6"
        >
          <div className="space-y-0.5 mt-[-10px]">
            <InfoRow label="Contact Number" value={p.phone} placeholder="+91 99999 99999" editing={editing} onChange={field('phone')} type="tel" />
            <InfoRow label="Date of Birth" value={p.birthday} placeholder="YYYY-MM-DD" editing={editing} onChange={field('birthday')} type="date" />
            <InfoRow label="Blood Group" value={p.blood_group} placeholder="e.g. A+" editing={editing} onChange={field('blood_group')} />
            <InfoRow label="Place of Birth" value={p.birthplace} placeholder="City, Country" editing={editing} onChange={field('birthplace')} />
            <InfoRow label="Guardian Name" value={p.guardian_name} placeholder="Full name of guardian" editing={editing} onChange={field('guardian_name')} />
            <div className="py-2.5">
              <SectionLabel>Hobbies & Leisure</SectionLabel>
              <TagList tags={interests} editing={editing} onAdd={(t) => field('interests')([...interests, t])} onRemove={(i) => field('interests')(interests.filter((_, idx)=> idx !== i))} placeholder="Add your hobbies" />
            </div>
          </div>
        </ExpandableCard>

        {/* Asset Tracking */}
        <ExpandableCard 
          icon="inventory_2" title="Company Hardware" accent="#8B5CF6" summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{rawAssets.length} item(s) currently assigned</p>}
          isOpen={openCards.has('assets')} onToggle={() => toggleCard('assets')}
        >
          <div className="space-y-3">
             {editing && (
                <div className="mt-[-8px] mb-3">
                   {!showAssetForm ? (
                     <button onClick={() => setShowAssetForm(true)} className="w-full py-2.5 rounded-xl border border-dashed text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: '#8B5CF6' }}>
                       + Log Assigned Asset
                     </button>
                   ) : (
                     <div className="p-4 rounded-2xl space-y-3 border border-dashed" style={{ backgroundColor: 'rgba(139, 92, 246, 0.03)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                        <input value={assetDraft.name} onChange={(e) => setAssetDraft(d => ({ ...d, name: e.target.value }))} placeholder="Asset Name (e.g. MacBook Air)" className="w-full text-xs p-2.5 rounded-xl border outline-none" style={{ backgroundColor: 'var(--c-surface)' }} />
                        <input value={assetDraft.serial} onChange={(e) => setAssetDraft(d => ({ ...d, serial: e.target.value }))} placeholder="Serial Number / Tag" className="w-full text-xs p-2.5 rounded-xl border outline-none" style={{ backgroundColor: 'var(--c-surface)' }} />
                        <select value={assetDraft.status} onChange={(e)=> setAssetDraft(d => ({ ...d, status: e.target.value }))} className="w-full text-xs p-2.5 rounded-xl border outline-none" style={{ backgroundColor: 'var(--c-surface)' }}>
                           <option>Active</option><option>Damaged</option><option>Returned</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={addAsset} className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-violet-600">Add</button>
                          <button onClick={() => setShowAssetForm(false)} className="flex-1 py-2 text-xs font-bold rounded-xl bg-white border">Cancel</button>
                        </div>
                     </div>
                   )}
                </div>
             )}
             {rawAssets.length === 0 ? (
                <p className="text-center py-4 text-[11px] italic" style={{ color: 'var(--c-t4)' }}>No assets logged.</p>
             ) : (
                <div className="space-y-2">
                   {rawAssets.map((asset, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 border">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-xl shrink-0">{asset.emoji}</div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-extrabold truncate" style={{ color: 'var(--c-t1)' }}>{asset.name}</p>
                           <p className="text-[10px] font-mono opacity-60 truncate">{asset.serial || 'No Serial'}</p>
                        </div>
                        {editing && <button onClick={() => field('assets')(rawAssets.filter((_, idx)=> idx !== i))} className="p-1.5 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5 text-red-500" /></button>}
                      </div>
                   ))}
                </div>
             )}
          </div>
        </ExpandableCard>

        {/* Certifications and Badges (Expanded for wider view in Row 2) */}
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
           <ExpandableCard icon="emoji_events" title="Accomplishments & Badges" summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{earnedBadgeCount} badges collected!</p>} isOpen={openCards.has('badges')} onToggle={()=> toggleCard('badges')} accent="#F59E0B">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                 {autoBadges.map(b => (
                   <div key={b.name} className={`flex flex-col items-center p-4 rounded-2xl text-center border transition-all ${b.earned ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 opacity-40 grayscale'}`}>
                      <span className="material-symbols-outlined text-orange-500 mb-2" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                      <p className="text-[11px] font-extrabold" style={{ color: 'var(--c-t1)' }}>{b.name}</p>
                      <p className="text-[9px] mt-1 line-clamp-2" style={{ color: 'var(--c-t3)' }}>{b.desc}</p>
                   </div>
                 ))}
                 {rawBadges.map(b => (
                    <div key={b.name} className={`flex flex-col items-center p-4 rounded-2xl text-center border bg-white/50 ${!b.earned && 'opacity-40 grayscale blur-[1px]'}`}>
                      <span className="material-symbols-outlined text-blue-500 mb-2" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                      <p className="text-[11px] font-extrabold" style={{ color: 'var(--c-t1)' }}>{b.name}</p>
                      <p className="text-[9px] mt-1" style={{ color: 'var(--c-t3)' }}>{b.desc}</p>
                    </div>
                 ))}
              </div>
           </ExpandableCard>

           <ExpandableCard icon="verified" title="Professional Certifications" summary={<p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{completedCertsCount} verified certs</p>} isOpen={openCards.has('certs')} onToggle={()=> toggleCard('certs')} accent="#10B981">
              <div className="space-y-4">
                 {editing && (
                   <div className="mt-[-8px]">
                      {!showCertForm ? (
                        <button onClick={() => setShowCertForm(true)} className="w-full py-2.5 rounded-xl border border-dashed text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10B981' }}>
                          + Add Verified Certification
                        </button>
                      ) : (
                        <div className="p-4 rounded-2xl space-y-3 border border-dashed" style={{ backgroundColor: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                           <input value={certDraft.name} onChange={(e) => setCertDraft(d => ({ ...d, name: e.target.value }))} placeholder="Certification Full Name" className="w-full text-xs p-2.5 rounded-xl border outline-none" style={{ backgroundColor: 'var(--c-surface)' }} />
                           <div className="space-y-1">
                              <label className="text-[9px] font-extrabold uppercase px-1">Completion: {certDraft.progress}%</label>
                              <input type="range" min="0" max="100" value={certDraft.progress} onChange={(e)=> setCertDraft(d => ({ ...d, progress: +e.target.value }))} className="w-full accent-emerald-500 h-1.5 rounded-full" />
                           </div>
                           <input value={certDraft.badge_url} onChange={(e) => setCertDraft(d => ({ ...d, badge_url: e.target.value }))} placeholder="Credential ID / Link" className="w-full text-xs p-2.5 rounded-xl border outline-none" style={{ backgroundColor: 'var(--c-surface)' }} />
                           <div className="flex gap-2">
                             <button onClick={addCert} className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600">Sync</button>
                             <button onClick={() => setShowCertForm(false)} className="flex-1 py-2 text-xs font-bold rounded-xl bg-white border">Cancel</button>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
                 {rawCerts.length === 0 ? (
                   <p className="text-center py-4 text-[11px] italic" style={{ color: 'var(--c-t4)' }}>No certifications logged.</p>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rawCerts.map((cert, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/60 border hover:shadow-sm transition-shadow">
                           <div className="flex justify-between items-start mb-2">
                             <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm font-extrabold truncate" style={{ color: 'var(--c-t1)' }}>{cert.name}</p>
                                <p className="text-[10px] opacity-60 truncate">{cert.issuer || 'Professional Board'}</p>
                             </div>
                             {cert.badge_url && (
                               <a href={cert.badge_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                 <ExternalLink className="w-3.5 h-3.5" />
                               </a>
                             )}
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cert.progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold min-w-[28px] text-right">{cert.progress}%</span>
                           </div>
                           {editing && <button onClick={() => field('certifications')(rawCerts.filter((_, idx)=> idx !== i))} className="mt-3 w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg">Remove</button>}
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </ExpandableCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          JOURNEY TRACKER
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="card-kinetic p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
           <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
           </div>
           <div>
              <h3 className="text-lg font-extrabold leading-tight" style={{ color: 'var(--c-t1)' }}>Gadiel Career Journey</h3>
              <p className="text-xs opacity-60">Milestones reaching towards professional excellence</p>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <JourneyTile value={gadielDays} label="Days at Gadiel" sub="And counting!" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#fff' }} />
           <JourneyTile value={anniversaryDays} label="Anvrsry Goals" sub="Plan a celebration" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t1)' }} />
           <JourneyTile value={survivedMondays} label="Mondays Win" sub="Still consistent!" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB' }} />
           <JourneyTile value={fridayDays === 0 ? 'Now!' : fridayDays} label="Next Friday" sub="Weekend loading…" style={{ backgroundColor: 'rgba(255,148,110,0.1)', color: '#c04a00' }} />
           <JourneyTile value={birthdayDays === null ? '—' : birthdayDays === 0 ? 'Today!' : birthdayDays} label="Your Day" sub={birthdayDays === 0 ? 'HAPPY BIRTHDAY!' : 'Days to celebrate'} style={{ backgroundColor: 'rgba(59,130,246,0.06)', color: '#3B82F6' }} />
        </div>
      </div>
    </div>
  )
}
