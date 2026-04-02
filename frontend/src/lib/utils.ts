import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const year = d.getFullYear()
  if (fmt === 'dd MMM yyyy') return `${day} ${months[d.getMonth()]} ${year}`
  if (fmt === 'MMM yyyy') return `${months[d.getMonth()]} ${year}`
  if (fmt === 'dd/MM/yyyy') return `${day}/${String(d.getMonth()+1).padStart(2,'0')}/${year}`
  return d.toLocaleDateString('en-IN')
}

export function formatTime(datetime: string | null | undefined): string {
  if (!datetime) return '—'
  // Ensure UTC interpretation: if no timezone offset present, treat as UTC (backend stores UTC)
  const str = /[Zz]|[+-]\d{2}:?\d{2}$/.test(datetime) ? datetime : datetime + 'Z'
  const d = new Date(str)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatMinutes(mins: number): string {
  if (!mins) return '0h 0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function capitalize(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}
