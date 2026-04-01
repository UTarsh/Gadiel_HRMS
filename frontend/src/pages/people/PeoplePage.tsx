import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { employeesApi } from '@/api/employees'
import { profileApi, resolveAvatarUrl } from '@/api/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuthStore } from '@/store/auth'
import type { Employee } from '@/types'

function getConnectorStyle(isFirst: boolean, isLast: boolean, isSingle: boolean): React.CSSProperties {
  const color = '#60A5FA'
  if (isSingle) return { display: 'none' }
  if (isFirst)  return { background: `linear-gradient(to right, transparent 50%, ${color} 50%)`, height: 2 }
  if (isLast)   return { background: `linear-gradient(to right, ${color} 50%, transparent 50%)`, height: 2 }
  return { backgroundColor: color, height: 2 }
}

function OrgTreeNode({
  emp, allEmployees, depth = 0, isDark, onClickEmp,
}: {
  emp: Employee; allEmployees: Employee[]; depth?: number; isDark: boolean; onClickEmp: (id: string) => void
}) {
  const children = allEmployees
    .filter(e => e.reporting_manager_id === emp.id)
    .slice()
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  const cardStyles: Record<number, React.CSSProperties> = {
    0: { background: '#1D4ED8', color: '#fff', boxShadow: '0 8px 24px rgba(29,78,216,0.35)' },
    1: {
      background: isDark ? '#0F2040' : 'var(--c-card)',
      color: isDark ? '#E2E8F0' : '#1E293B',
      border: `1.5px solid ${isDark ? '#1E3A5F' : '#2563EB'}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
    },
    2: {
      background: isDark ? '#0A1830' : 'var(--c-card)',
      color: isDark ? '#94A3B8' : '#1E293B',
      border: `1.5px solid ${isDark ? '#142040' : '#93C5FD'}`,
    },
  }
  const style = cardStyles[Math.min(depth, 2)]
  const isDeep = depth >= 2

  // Avatar size: bigger at depth 0, medium at 1, smaller at 2+
  const avatarSize = depth === 0 ? 'h-12 w-12' : depth === 1 ? 'h-10 w-10' : 'h-8 w-8'
  const nameSize = depth === 0 ? 'text-sm' : depth === 1 ? 'text-xs' : 'text-[10px]'
  const roleSize = depth === 0 ? 'text-[11px]' : 'text-[9px]'
  const padding = depth === 0 ? '14px 20px' : depth === 1 ? '12px 16px' : '10px 14px'
  const minW = depth === 0 ? 220 : depth === 1 ? 180 : 150

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        onClick={() => onClickEmp(emp.id)}
        className="rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{ ...style, padding, minWidth: minW, maxWidth: 280, textAlign: 'left' }}
      >
        <div className="flex items-center gap-3">
          <Avatar className={`${avatarSize} shrink-0`}>
            <AvatarImage src={resolveAvatarUrl((emp.ghibli_image_url ?? emp.profile_picture_url) || undefined) || undefined} />
            <AvatarFallback
              className="font-bold"
              style={{
                fontSize: depth === 0 ? '14px' : depth === 1 ? '12px' : '10px',
                background: depth === 0 ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
                color: '#fff',
              }}
            >
              {getInitials(emp.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p
              className={`font-bold leading-tight break-words ${nameSize}`}
              style={{ color: depth === 0 ? '#fff' : (isDark ? '#E2E8F0' : '#1E3A5F'), fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {emp.full_name}
            </p>
            <p className={`break-words mt-0.5 ${roleSize}`} style={{ color: depth === 0 ? 'rgba(255,255,255,0.75)' : '#64748B' }}>
              {emp.designation?.name || (emp.role || 'Employee').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </button>

      {children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 24, backgroundColor: '#60A5FA' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === children.length - 1
              const isSingle = children.length === 1
              return (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', ...getConnectorStyle(isFirst, isLast, isSingle) }} />
                  <div style={{ width: 2, height: 24, backgroundColor: isSingle ? 'transparent' : '#60A5FA' }} />
                  <div style={{ paddingLeft: 12, paddingRight: 12 }}>
                    <OrgTreeNode emp={child} allEmployees={allEmployees} depth={depth + 1} isDark={isDark} onClickEmp={onClickEmp} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function PeoplePage() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { employee: me } = useAuthStore()

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => employeesApi.orgChart(),
    enabled: !!me,
  })

  const employees: Employee[] = orgData?.data?.data ?? []

  const roots = useMemo(() => {
    const ids = new Set(employees.map(e => e.id))
    return employees
      .filter(e => !e.reporting_manager_id || !ids.has(e.reporting_manager_id))
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [employees])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
            People
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-t3)' }}>
            {employees.length} people · complete company hierarchy
          </p>
        </div>
      </div>

      {/* Org Chart */}
      <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)', padding: '40px 32px' }}>
          {roots.length === 0 ? (
            <p className="text-sm text-center py-20" style={{ color: 'var(--c-t3)' }}>No org chart data available.</p>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 40, flexWrap: 'nowrap' }}>
              {roots.map(root => (
                <OrgTreeNode
                  key={root.id}
                  emp={root}
                  allEmployees={employees}
                  depth={0}
                  isDark={isDark}
                  onClickEmp={(id) => navigate(`/employees/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
