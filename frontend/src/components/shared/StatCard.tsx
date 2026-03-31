import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'
  subtitle?: string
  trend?: { value: number; label: string }
  loading?: boolean
}

const palette = {
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700', ring: 'ring-emerald-100' },
  blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    val: 'text-blue-700',    ring: 'ring-blue-100' },
  amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700',   ring: 'ring-amber-100' },
  red:    { bg: 'bg-red-50',     icon: 'text-red-600',     val: 'text-red-700',     ring: 'ring-red-100' },
  purple: { bg: 'bg-purple-50',  icon: 'text-purple-600',  val: 'text-purple-700',  ring: 'ring-purple-100' },
  slate:  { bg: 'bg-slate-100',  icon: 'text-slate-600',   val: 'text-slate-700',   ring: 'ring-slate-200' },
}

export function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend, loading }: StatCardProps) {
  const p = palette[color]

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
        <Skeleton className="h-4 w-20 mb-4" />
        <Skeleton className="h-8 w-14 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{title}</p>
          <p className={cn('text-3xl font-bold tracking-tight', p.val)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl ring-1', p.bg, p.ring)}>
          <Icon className={cn('w-5 h-5', p.icon)} />
        </div>
      </div>
    </div>
  )
}
