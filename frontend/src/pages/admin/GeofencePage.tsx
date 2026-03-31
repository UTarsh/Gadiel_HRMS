import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin, Plus, Pencil, Trash2, Users, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Loader2, Search, Globe, Wifi, WifiOff,
  Navigation, Shield, Radio, ExternalLink,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { attendanceApi } from '@/api/attendance'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { GeofenceZone, GeofenceEmployee } from '@/types'

type ZoneWithCount = GeofenceZone & { employee_count: number }

type ZoneFormState = {
  name: string
  latitude: string
  longitude: string
  radius_meters: string
  employee_ids: string[]
}

const emptyForm: ZoneFormState = {
  name: '',
  latitude: '',
  longitude: '',
  radius_meters: '200',
  employee_ids: [],
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeErr = error as { response?: { data?: { detail?: string; message?: string } } }
  return maybeErr?.response?.data?.detail || maybeErr?.response?.data?.message || fallback
}

/* ── Mini avatar from initials ── */
function InitialAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue}, 65%, 55%), hsl(${(hue + 30) % 360}, 55%, 42%))`,
      }}
    >
      {initials}
    </div>
  )
}

/* ── Zone Form (dialog body) ── */
function ZoneForm({
  initial,
  employees,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: ZoneFormState
  employees: GeofenceEmployee[]
  onSubmit: (data: { name: string; latitude: number; longitude: number; radius_meters: number; employee_ids: string[] }) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<ZoneFormState>(initial ?? emptyForm)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)

  const set = (k: Exclude<keyof ZoneFormState, 'employee_ids'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) =>
      emp.full_name.toLowerCase().includes(q) || emp.emp_code.toLowerCase().includes(q)
    )
  }, [employeeSearch, employees])

  const toggleEmployee = (employeeId: string) => {
    setForm((prev) => {
      if (prev.employee_ids.includes(employeeId)) {
        return { ...prev, employee_ids: prev.employee_ids.filter((id) => id !== employeeId) }
      }
      return { ...prev, employee_ids: [...prev.employee_ids, employeeId] }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error('Name, latitude and longitude are required')
      return
    }
    const latitude = parseFloat(form.latitude)
    const longitude = parseFloat(form.longitude)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error('Latitude and longitude must be valid numbers')
      return
    }
    onSubmit({
      name: form.name,
      latitude,
      longitude,
      radius_meters: parseInt(form.radius_meters) || 200,
      employee_ids: form.employee_ids,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col h-full flex-1">
      <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold px-1" style={{ color: 'var(--c-t1)' }}>Zone Name</label>
          <input className="input-kinetic w-full h-11 px-4 text-sm" placeholder="e.g. Delhi Head Office" value={form.name} onChange={set('name')} required />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold px-1" style={{ color: 'var(--c-t1)' }}>Latitude</label>
            <input className="input-kinetic w-full h-11 px-4 text-sm" placeholder="28.6139" value={form.latitude} onChange={set('latitude')} type="number" step="any" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold px-1" style={{ color: 'var(--c-t1)' }}>Longitude</label>
            <input className="input-kinetic w-full h-11 px-4 text-sm" placeholder="77.2090" value={form.longitude} onChange={set('longitude')} type="number" step="any" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold px-1" style={{ color: 'var(--c-t1)' }}>Radius (meters)</label>
          <input className="input-kinetic w-full h-11 px-4 text-sm" placeholder="200" value={form.radius_meters} onChange={set('radius_meters')} type="number" min="50" max="5000" />
          <p className="text-[10px] px-1 font-medium opacity-60" style={{ color: 'var(--c-t2)' }}>GPS tolerance radius. 200m recommended.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold px-1" style={{ color: 'var(--c-t1)' }}>Assign Employees</label>
          <button
            type="button"
            onClick={() => setShowEmployeePicker((prev) => !prev)}
            className="input-kinetic w-full h-11 px-4 text-sm text-left flex items-center justify-between"
          >
            <span className="truncate opacity-80">
              {form.employee_ids.length > 0
                ? `${form.employee_ids.length} selected`
                : 'Choose employees'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{showEmployeePicker ? 'Hide' : 'Show'}</span>
          </button>

          {showEmployeePicker && (
            <div className="rounded-2xl border bg-white/50 p-3 space-y-3" style={{ borderColor: 'var(--c-border2)' }}>
              <input
                className="input-kinetic w-full h-10 px-4 text-xs"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
              <div className="max-h-44 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: 'var(--c-border3)', backgroundColor: 'var(--c-surface)' }}>
                {filteredEmployees.length === 0 ? (
                  <p className="text-[10px] font-bold opacity-40 py-4 text-center">No results</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = form.employee_ids.includes(emp.id)
                    return (
                      <label
                        key={emp.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/40',
                          selected && 'bg-blue-50/50'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                          checked={selected}
                          onChange={() => toggleEmployee(emp.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{emp.full_name}</p>
                          <p className="text-[10px] font-medium opacity-60" style={{ color: 'var(--c-t2)' }}>{emp.emp_code}</p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-1">
                <button
                  type="button"
                  onClick={() => {
                    const filteredIds = filteredEmployees.map((emp) => emp.id)
                    setForm((prev) => ({
                      ...prev,
                      employee_ids: Array.from(new Set([...prev.employee_ids, ...filteredIds])),
                    }))
                  }}
                  className="text-blue-600 hover:opacity-80"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, employee_ids: [] }))}
                  className="opacity-40 hover:opacity-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="flex-row gap-3 mt-6 pt-5 border-t" style={{ borderColor: 'var(--c-border3)' }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-full text-sm font-bold transition-all active:scale-95"
          style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-11 rounded-full bg-blue-600 text-white text-sm font-bold transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Zone'}
        </button>
      </DialogFooter>
    </form>
  )
}

export function GeofencePage() {
  const { employee } = useAuthStore()
  const qc = useQueryClient()
  const isHr = employee?.role === 'hr_admin' || employee?.role === 'super_admin'

  const [createOpen, setCreateOpen] = useState(false)
  const [editZone, setEditZone] = useState<ZoneWithCount | null>(null)
  const [deleteZone, setDeleteZone] = useState<ZoneWithCount | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['geofence-zones'],
    queryFn: () => attendanceApi.listZones(),
  })

  const { data: employeesData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['geofence-employees'],
    queryFn: () => attendanceApi.listGeofenceEmployees(),
    enabled: isHr,
  })

  const zones: ZoneWithCount[] = (data?.data?.data ?? []) as ZoneWithCount[]
  const employees: GeofenceEmployee[] = (employeesData?.data?.data ?? []) as GeofenceEmployee[]

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones])

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) =>
      emp.full_name.toLowerCase().includes(q) || emp.emp_code.toLowerCase().includes(q)
    )
  }, [employeeSearch, employees])

  /* ── Counts for the 3 protocol modes ── */
  const modeCounts = useMemo(() => {
    let wfh = 0, siteTargeted = 0, globalActive = 0
    for (const emp of employees) {
      if (emp.skip_location_check) wfh++
      else if (emp.geofence_zone_id) siteTargeted++
      else globalActive++
    }
    return { wfh, siteTargeted, globalActive }
  }, [employees])

  const activeZoneCount = zones.filter((z) => z.is_active).length
  const totalAssigned = zones.reduce((sum, z) => sum + z.employee_count, 0)

  const createMutation = useMutation({
    mutationFn: attendanceApi.createZone,
    onSuccess: (res) => {
      toast.success(res.data.message || 'Zone created')
      setCreateOpen(false)
      qc.invalidateQueries({ queryKey: ['geofence-zones'] })
      qc.invalidateQueries({ queryKey: ['geofence-employees'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create zone')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof attendanceApi.updateZone>[1] }) =>
      attendanceApi.updateZone(id, data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Zone updated')
      setEditZone(null)
      qc.invalidateQueries({ queryKey: ['geofence-zones'] })
      qc.invalidateQueries({ queryKey: ['geofence-employees'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update zone')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.deleteZone(id),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Zone deleted')
      setDeleteZone(null)
      qc.invalidateQueries({ queryKey: ['geofence-zones'] })
      qc.invalidateQueries({ queryKey: ['geofence-employees'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete zone')),
  })

  const toggleActive = (zone: ZoneWithCount) => {
    updateMutation.mutate({ id: zone.id, data: { is_active: !zone.is_active } })
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto page-enter">
      {/* ── Hero Header ── */}
      <div
        className="card-kinetic overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)',
          border: 'none',
        }}
      >
        {/* Decorative background circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
        </div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-sky-300" />
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Geofence Zones
                </h1>
              </div>
              <p className="text-sky-200/70 text-sm ml-[52px]">
                GPS boundaries for attendance verification
              </p>
            </div>
            {isHr && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-2 h-11 px-6 text-sm font-bold rounded-full bg-white text-slate-900 hover:bg-sky-50 transition-all active:scale-95 shadow-lg shadow-black/20 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> New Zone
              </button>
            )}
          </div>

          {/* ── Quick Stats Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { icon: Radio, label: 'Active', value: activeZoneCount, sub: `of ${zones.length}`, accent: '#34d399' },
              { icon: Users, label: 'Assigned', value: totalAssigned, sub: 'employees', accent: '#60a5fa' },
              { icon: Wifi, label: 'WFH', value: modeCounts.wfh, sub: 'skip GPS', accent: '#fbbf24' },
              { icon: Globe, label: 'Global', value: modeCounts.globalActive, sub: 'all zones', accent: '#a78bfa' },
            ].map((s) => (
              <div key={s.label} className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{s.label}</span>
                </div>
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-[10px] text-white/40 font-medium mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Zone List (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-widest opacity-50" style={{ color: 'var(--c-t1)' }}>Zones</h3>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{zones.length} SITES</span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[2rem]" />)}
            </div>
          ) : zones.length === 0 ? (
            <div className="card-kinetic py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-sm font-bold opacity-40">No zones defined yet</p>
              <p className="text-xs opacity-30 mt-1">Create one to start enforcing GPS attendance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => {
                const isExpanded = expandedId === zone.id
                return (
                  <div
                    key={zone.id}
                    className="card-kinetic overflow-hidden group transition-all duration-300"
                    style={{ border: isExpanded ? '1.5px solid #2563EB' : '1px solid var(--c-border3)' }}
                  >
                    {/* Color accent bar */}
                    <div
                      className="h-1 w-full transition-colors"
                      style={{ background: zone.is_active ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : '#e2e8f0' }}
                    />

                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Icon */}
                      <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                        zone.is_active ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-slate-100 text-slate-400'
                      )}>
                        <MapPin className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[15px] font-extrabold truncate" style={{ color: 'var(--c-t1)' }}>{zone.name}</p>
                          {!zone.is_active && (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase">OFF</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: 'var(--c-t3)' }}>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 opacity-40" />
                            {zone.radius_meters}m
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Users className="w-3 h-3 opacity-40" />
                            {zone.employee_count}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <div className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50/50 mr-1">
                          <Users className="w-3 h-3 opacity-40" />
                          <span className="text-[10px] font-bold" style={{ color: 'var(--c-t2)' }}>{zone.employee_count}</span>
                        </div>

                        {isHr && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => toggleActive(zone)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white transition-colors"
                              title={zone.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {zone.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                            </button>
                            <button
                              onClick={() => setEditZone(zone)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteZone(zone)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : zone.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-white transition-all active:scale-95 ml-1"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'LAT', val: zone.latitude.toFixed(6) },
                            { label: 'LNG', val: zone.longitude.toFixed(6) },
                            { label: 'RADIUS', val: `${zone.radius_meters}m` },
                            { label: 'ASSIGNED', val: `${zone.employee_count}` },
                          ].map(stat => (
                            <div key={stat.label} className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                              <p className="text-sm font-extrabold" style={{ color: 'var(--c-t1)' }}>{stat.val}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <a
                            href={`https://www.google.com/maps?q=${zone.latitude},${zone.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open in Maps
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Employee Assignment Sidebar (1/3 width) ── */}
        <div className="space-y-4">
          <div className="card-kinetic p-5 md:p-6 flex flex-col" style={{ border: '1px solid var(--c-border3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
                Team Locations
              </h3>
              <span className="text-[10px] font-bold bg-white px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--c-border3)', color: 'var(--c-t4)' }}>
                {employees.length}
              </span>
            </div>

            {/* Protocol Mode Legend */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { icon: WifiOff, label: 'WFH', color: '#f59e0b', bg: '#fef3c7' },
                { icon: MapPin, label: 'Site', color: '#3b82f6', bg: '#eff6ff' },
                { icon: Globe, label: 'Global', color: '#10b981', bg: '#ecfdf5' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>
                  <m.icon className="w-3 h-3" />
                  {m.label}
                </div>
              ))}
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                className="input-kinetic w-full h-10 pl-10 pr-4 text-xs font-medium"
                placeholder="Search..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>

            {isEmployeesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40">
                <Users className="w-8 h-8 mb-2" />
                <p className="text-xs font-bold">No results</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 -mr-1 max-h-[600px] space-y-1.5">
                {filteredEmployees.map((emp) => {
                  const isWfh = emp.skip_location_check
                  const isSite = !!emp.geofence_zone_id
                  const zoneName = emp.geofence_zone_id ? zoneById.get(emp.geofence_zone_id) : null

                  let statusColor = '#10b981', statusBg = '#ecfdf5', statusBorder = '#d1fae5'
                  let statusLabel = 'Global'
                  if (isWfh) {
                    statusColor = '#d97706'; statusBg = '#fffbeb'; statusBorder = '#fef3c7'
                    statusLabel = 'WFH'
                  } else if (isSite) {
                    statusColor = '#2563eb'; statusBg = '#eff6ff'; statusBorder = '#dbeafe'
                    statusLabel = zoneName && zoneName.length > 12 ? zoneName.substring(0, 11) + '…' : zoneName || 'Site'
                  }

                  return (
                    <div
                      key={emp.id}
                      className="p-3 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all border"
                      style={{ borderColor: 'var(--c-border3)', backgroundColor: 'var(--c-surface)' }}
                    >
                      <InitialAvatar name={emp.full_name} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--c-t1)' }}>{emp.full_name}</p>
                        <p className="text-[10px] font-medium opacity-50 mt-0.5" style={{ color: 'var(--c-t2)' }}>{emp.emp_code}</p>
                      </div>
                      <span
                        className="text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide shrink-0 whitespace-nowrap border"
                        style={{ color: statusColor, backgroundColor: statusBg, borderColor: statusBorder }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[94vw] max-w-[560px] rounded-[2rem] p-6 max-h-[90vh] overflow-hidden flex flex-col border-none shadow-2xl" style={{ backgroundColor: 'var(--c-card)' }}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold" style={{ color: 'var(--c-t1)' }}>New Zone</DialogTitle>
          </DialogHeader>
          <ZoneForm
            key={createOpen ? 'create-open' : 'create-closed'}
            employees={employees}
            onSubmit={(d) => createMutation.mutate(d)}
            onCancel={() => setCreateOpen(false)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editZone} onOpenChange={() => setEditZone(null)}>
        <DialogContent className="w-[94vw] max-w-[560px] rounded-[2rem] p-6 max-h-[90vh] overflow-hidden flex flex-col border-none shadow-2xl" style={{ backgroundColor: 'var(--c-card)' }}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold" style={{ color: 'var(--c-t1)' }}>Edit Zone</DialogTitle>
          </DialogHeader>
          {editZone && (
            <ZoneForm
              key={`${editZone.id}-${employees.length}`}
              initial={{
                name: editZone.name,
                latitude: String(editZone.latitude),
                longitude: String(editZone.longitude),
                radius_meters: String(editZone.radius_meters),
                employee_ids: employees
                  .filter((emp) => emp.geofence_zone_id === editZone.id)
                  .map((emp) => emp.id),
              }}
              employees={employees}
              onSubmit={(d) => updateMutation.mutate({ id: editZone.id, data: d })}
              onCancel={() => setEditZone(null)}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteZone} onOpenChange={() => setDeleteZone(null)}>
        <DialogContent className="max-w-sm rounded-[2rem] p-6 border-none shadow-2xl" style={{ backgroundColor: 'var(--c-card)' }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-red-600">Delete Zone?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--c-t2)' }}>
              Delete <span className="font-extrabold text-slate-900">{deleteZone?.name}</span>? This can't be undone.
            </p>
            {deleteZone && deleteZone.employee_count > 0 && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  <span className="font-bold">{deleteZone.employee_count} employee{deleteZone.employee_count > 1 ? 's' : ''}</span> will be moved to global zone validation.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-3">
            <button
              onClick={() => setDeleteZone(null)}
              className="flex-1 h-12 rounded-full text-sm font-bold"
              style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteZone && deleteMutation.mutate(deleteZone.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 h-12 rounded-full bg-red-600 text-white text-sm font-bold active:scale-95 transition-all shadow-lg shadow-red-200"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
