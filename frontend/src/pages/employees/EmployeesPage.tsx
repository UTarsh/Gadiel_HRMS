import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { employeesApi } from '@/api/employees'
import { getInitials, formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const statusStyle: Record<string, { bg: string; color: string }> = {
  active:     { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
  on_leave:   { bg: 'rgba(217,119,6,0.1)',   color: '#D97706' },
  terminated: { bg: 'rgba(186,26,26,0.08)',  color: '#ba1a1a' },
  resigned:   { bg: 'rgba(186,26,26,0.08)',  color: '#ba1a1a' },
  inactive:   { bg: 'var(--c-surface)',      color: 'var(--c-t3)' },
}

export function EmployeesPage() {
  const { employee: me } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deptId, setDeptId] = useState<string>('')
  const [page, setPage] = useState(1)
  const perPage = 20

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeesApi.departments(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, deptId],
    queryFn: () =>
      employeesApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        department_id: deptId || undefined,
      }),
    placeholderData: (prev) => prev,
  })

  const employees = data?.data?.data ?? []
  const totalPages = data?.data?.total_pages ?? 1
  const total = data?.data?.total ?? 0
  const departments = depts?.data?.data ?? []
  const isHrOrAdmin = me?.role === 'hr_admin' || me?.role === 'super_admin'

  return (
    <div className="space-y-6 md:space-y-8 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}
          >
            Our <span className="italic" style={{ color: '#2563EB' }}>Squad</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-t3)' }}>{total} total members in the organization</p>
        </div>
        {isHrOrAdmin && (
          <button
            onClick={() => navigate('/employees/new')}
            className="btn-primary flex items-center justify-center gap-2 h-11 px-6 text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--c-t3)' }} />
          <input
            type="text"
            placeholder="Search by name or employee code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input-kinetic w-full h-12 pl-11 pr-4 text-sm"
            style={{ color: 'var(--c-t1)' }}
          />
        </div>
        {departments.length > 0 && (
          <Select value={deptId || 'all'} onValueChange={(v) => { setDeptId(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger
              className="w-full md:w-56 shrink-0 h-12 text-sm border-none shadow-none"
              style={{ backgroundColor: 'var(--c-surface)', borderRadius: '1rem', color: 'var(--c-t1)' }}
            >
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-xl" style={{ backgroundColor: 'var(--c-card)' }}>
              <SelectItem value="all" className="rounded-xl">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="rounded-xl">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Employee list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-5 rounded-[2rem] bg-white/50 animate-pulse">
              <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="card-kinetic p-12 text-center">
          <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filters" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const badge = statusStyle[emp.employment_status] ?? { bg: 'var(--c-surface)', color: 'var(--c-t3)' }
            return (
              <button
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="card-kinetic p-5 text-left transition-all hover:scale-[1.02] active:scale-95 flex flex-col h-full"
                style={{ border: '1px solid var(--c-border3)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Avatar className="h-14 w-14 rounded-2xl shrink-0">
                    <AvatarImage src={emp.profile_picture_url || undefined} />
                    <AvatarFallback
                      className="text-white text-lg font-bold rounded-2xl"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
                    >
                      {getInitials(emp.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {emp.employment_status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-extrabold break-words leading-tight" style={{ color: 'var(--c-t1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {emp.full_name}
                  </h4>
                  <p className="text-xs font-bold mt-1" style={{ color: '#3B82F6' }}>{emp.emp_code}</p>
                  
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 opacity-70">
                      <span className="material-symbols-outlined text-[14px]">work</span>
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--c-t2)' }}>
                        {emp.designation?.name ?? 'No Title'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-70">
                      <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--c-t2)' }}>
                        {emp.department?.name ?? 'General'}
                      </p>
                    </div>
                  </div>
                </div>

                {emp.date_of_joining && (
                  <div className="mt-5 pt-4 border-t border-slate-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-t4)' }}>
                      Since {formatDate(emp.date_of_joining)}
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-bold" style={{ color: 'var(--c-t4)' }}>PAGE {page} OF {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="h-10 w-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="h-10 w-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
