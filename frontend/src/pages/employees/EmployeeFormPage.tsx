import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { employeesApi } from '@/api/employees'
import { attendanceApi } from '@/api/attendance'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  gender: string
  role: string
  department_id: string
  designation_id: string
  employment_type: string
  employment_status: string
  date_of_joining: string
  date_of_birth: string
  work_location: string
  blood_group: string
  marital_status: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  geofence_zone_id: string
  skip_location_check: boolean
}

const emptyForm: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  gender: '', role: 'employee', department_id: '', designation_id: '',
  employment_type: 'full_time', employment_status: 'active',
  date_of_joining: '', date_of_birth: '', work_location: '',
  blood_group: '', marital_status: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  geofence_zone_id: '', skip_location_check: false,
}

// ─── Field components ─────────────────────────────────────────────────────────

function FormField({
  label, required, children, hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls = `w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900
  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30
  focus:border-primary transition-all disabled:opacity-60`

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { employee: me } = useAuthStore()

  const [form, setForm] = useState<FormData>(emptyForm)

  // Load existing employee for edit
  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: isEdit,
  })

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeesApi.departments(),
  })

  const { data: desigData } = useQuery({
    queryKey: ['designations'],
    queryFn: () => employeesApi.designations(),
  })

  const { data: zonesData } = useQuery({
    queryKey: ['geofence-zones'],
    queryFn: () => attendanceApi.listZones(),
  })

  const departments = depts?.data?.data ?? []
  const designations = desigData?.data?.data ?? []
  const zones = zonesData?.data?.data ?? []

  // Pre-fill form when editing
  useEffect(() => {
    const emp = empData?.data?.data
    if (emp) {
      setForm({
        first_name: emp.first_name ?? '',
        last_name: emp.last_name ?? '',
        email: emp.email ?? '',
        phone: emp.phone ?? '',
        gender: emp.gender ?? '',
        role: emp.role ?? 'employee',
        department_id: emp.department?.id ?? '',
        designation_id: emp.designation?.id ?? '',
        employment_type: emp.employment_type ?? 'full_time',
        employment_status: emp.employment_status ?? 'active',
        date_of_joining: emp.date_of_joining ?? '',
        date_of_birth: emp.date_of_birth ?? '',
        work_location: emp.work_location ?? '',
        blood_group: emp.blood_group ?? '',
        marital_status: emp.marital_status ?? '',
        emergency_contact_name: (emp as any).emergency_contact_name ?? '',
        emergency_contact_phone: (emp as any).emergency_contact_phone ?? '',
        emergency_contact_relation: (emp as any).emergency_contact_relation ?? '',
        geofence_zone_id: (emp as any).geofence_zone_id ?? '',
        skip_location_check: (emp as any).skip_location_check ?? false,
      })
    }
  }, [empData])

  const mutation = useMutation({
    mutationFn: () => {
      // Clean up empty strings → undefined
      const payload: Record<string, unknown> = {}
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') payload[k] = v
      })
      return isEdit
        ? employeesApi.update(id!, payload)
        : employeesApi.create(payload)
    },
    onSuccess: (res) => {
      const emp = res.data?.data
      toast.success(isEdit ? 'Employee updated' : 'Employee created')
      qc.invalidateQueries({ queryKey: ['employees'] })
      if (emp) {
        qc.invalidateQueries({ queryKey: ['employee', emp.id] })
        navigate(`/employees/${emp.id}`)
      } else {
        navigate('/')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save employee')
    },
  })

  const set = (key: keyof FormData) => (val: string) => setForm((f) => ({ ...f, [key]: val }))
  const setBool = (key: keyof FormData) => (val: boolean) => setForm((f) => ({ ...f, [key]: val }))
  const setInput = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('First name, last name and email are required')
      return
    }
    mutation.mutate()
  }

  if (isEdit && empLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEdit ? 'Update employee information' : 'Create a new employee account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <Section title="Basic Information" icon="👤">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <input
                className={inputCls}
                placeholder="First name"
                value={form.first_name}
                onChange={setInput('first_name')}
                required
              />
            </FormField>
            <FormField label="Last Name" required>
              <input
                className={inputCls}
                placeholder="Last name"
                value={form.last_name}
                onChange={setInput('last_name')}
                required
              />
            </FormField>
          </div>

          <FormField label="Work Email" required hint="Format: firstnameLAST_INITIAL@gadieltechnologies.com (e.g. karthikp@gadieltechnologies.com)">
<input
              className={inputCls}
              type="email"
              placeholder="e.g. karthikp@gadieltechnologies.com"
              value={form.email}
              onChange={setInput('email')}
              required
              disabled={isEdit}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <input
                className={inputCls}
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={setInput('phone')}
              />
            </FormField>
            <FormField label="Gender">
              <Select value={form.gender || 'none'} onValueChange={(v) => set('gender')(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </Section>

        {/* Employment */}
        <Section title="Employment Details" icon="💼">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" required>
              <Select value={form.role} onValueChange={set('role')}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="hr_admin">HR Admin</SelectItem>
                  {me?.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.employment_status} onValueChange={set('employment_status')}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department">
              <Select value={form.department_id || 'none'} onValueChange={(v) => set('department_id')(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Designation">
              <Select value={form.designation_id || 'none'} onValueChange={(v) => set('designation_id')(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No designation</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Employment Type">
              <Select value={form.employment_type} onValueChange={set('employment_type')}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Work Location">
              <input
                className={inputCls}
                placeholder="e.g. Chennai HQ"
                value={form.work_location}
                onChange={setInput('work_location')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date of Joining">
              <input
                className={inputCls}
                type="date"
                value={form.date_of_joining}
                onChange={setInput('date_of_joining')}
              />
            </FormField>
            <FormField label="Date of Birth">
              <input
                className={inputCls}
                type="date"
                value={form.date_of_birth}
                onChange={setInput('date_of_birth')}
              />
            </FormField>
          </div>
        </Section>

        {/* Personal */}
        <Section title="Personal Details" icon="📋">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Marital Status">
              <Select value={form.marital_status || 'none'} onValueChange={(v) => set('marital_status')(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Blood Group">
              <Select value={form.blood_group || 'none'} onValueChange={(v) => set('blood_group')(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Blood group" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Not known</SelectItem>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </Section>

        {/* Emergency contact */}
        <Section title="Emergency Contact" icon="🚨">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Name">
              <input
                className={inputCls}
                placeholder="Full name"
                value={form.emergency_contact_name}
                onChange={setInput('emergency_contact_name')}
              />
            </FormField>
            <FormField label="Relation">
              <input
                className={inputCls}
                placeholder="e.g. Spouse, Parent"
                value={form.emergency_contact_relation}
                onChange={setInput('emergency_contact_relation')}
              />
            </FormField>
          </div>
          <FormField label="Contact Phone">
            <input
              className={inputCls}
              type="tel"
              placeholder="+91 98765 43210"
              value={form.emergency_contact_phone}
              onChange={setInput('emergency_contact_phone')}
            />
          </FormField>
        </Section>

        {/* Geofence / Work Location */}
        <Section title="Attendance Location" icon="📍">
          {/* WFH toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">Work From Home / Skip GPS Check</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Punch-in is allowed from anywhere — no geofence validation
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBool('skip_location_check')(!form.skip_location_check)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0',
                form.skip_location_check ? 'bg-primary' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  form.skip_location_check ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Zone selector — only relevant when not WFH */}
          {!form.skip_location_check && (
            <FormField
              label="Assigned Geofence Zone"
              hint="Leave blank to use all active zones (standard office). Assign a specific zone for client-site or branch employees."
            >
              <Select
                value={form.geofence_zone_id || 'none'}
                onValueChange={(v) => set('geofence_zone_id')(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="All active zones (default)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">All active zones (default office)</SelectItem>
                  {zones.filter((z) => z.is_active).map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name} — r:{z.radius_meters}m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90
                       disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Employee'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  )
}
