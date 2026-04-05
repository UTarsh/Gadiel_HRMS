import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { employeesApi } from '@/api/employees'
import { useAuthStore } from '@/store/auth'

export function BirthdayBanner() {
  const { employee } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)

  const { data } = useQuery({
    queryKey: ['birthdays-today'],
    queryFn: () => employeesApi.birthdaysToday(),
    staleTime: 1000 * 60 * 60, // cache 1 hour — birthdays don't change mid-day
    enabled: !!employee,
  })

  const birthdays: any[] = data?.data?.data ?? []

  if (dismissed || birthdays.length === 0) return null

  const isMyBirthday = birthdays.some(b => b.id === employee?.id)
  const others = birthdays.filter(b => b.id !== employee?.id)

  let message = ''
  if (isMyBirthday && others.length === 0) {
    message = `Happy Birthday, ${employee?.first_name}! Wishing you a wonderful day! 🎂`
  } else if (isMyBirthday && others.length > 0) {
    const names = others.map(b => b.full_name.split(' ')[0]).join(', ')
    message = `Happy Birthday to you and ${names}! 🎂`
  } else if (others.length === 1) {
    const b = others[0]
    message = `Today is ${b.full_name}'s birthday${b.age ? ` (turning ${b.age})` : ''}! Wish them well! 🎂`
  } else {
    const first = others[0]
    const rest = others.length - 1
    message = `Today is ${first.full_name}'s birthday${rest > 0 ? ` and ${rest} other${rest > 1 ? 's' : ''}` : ''}! 🎂`
  }

  return (
    <div
      className="relative z-30 flex items-center justify-between gap-3 px-4 py-2.5"
      style={{ background: 'linear-gradient(135deg,#BE185D,#EC4899)', boxShadow: '0 2px 12px rgba(236,72,153,0.25)' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg shrink-0">🎂</span>
        <p className="text-xs font-bold text-white truncate">{message}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  )
}
