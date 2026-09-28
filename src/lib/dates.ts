import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import type { DateRange } from './types'

export type PresetId =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_90d'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'

export const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7d', label: 'Last 7 days' },
  { id: 'last_14d', label: 'Last 14 days' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'last_90d', label: 'Last 90 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'Year to date' },
]

export const iso = (d: Date) => format(d, 'yyyy-MM-dd')

/** Resolve a preset against `today`. "Last N days" excludes today, like Ads Manager. */
export function presetRange(id: Exclude<PresetId, 'custom'>, today = new Date()): DateRange {
  const y = subDays(today, 1)
  switch (id) {
    case 'today':
      return { since: iso(today), until: iso(today) }
    case 'yesterday':
      return { since: iso(y), until: iso(y) }
    case 'last_7d':
      return { since: iso(subDays(today, 7)), until: iso(y) }
    case 'last_14d':
      return { since: iso(subDays(today, 14)), until: iso(y) }
    case 'last_30d':
      return { since: iso(subDays(today, 30)), until: iso(y) }
    case 'last_90d':
      return { since: iso(subDays(today, 90)), until: iso(y) }
    case 'this_month':
      return { since: iso(startOfMonth(today)), until: iso(today) }
    case 'last_month': {
      const m = subMonths(today, 1)
      return { since: iso(startOfMonth(m)), until: iso(endOfMonth(m)) }
    }
    case 'this_year':
      return { since: iso(startOfYear(today)), until: iso(today) }
  }
}

export function rangeDays(r: DateRange): number {
  return differenceInCalendarDays(parseISO(r.until), parseISO(r.since)) + 1
}

/** The equally long period immediately before `r`. */
export function previousRange(r: DateRange): DateRange {
  const len = rangeDays(r)
  const since = parseISO(r.since)
  return { since: iso(subDays(since, len)), until: iso(subDays(since, 1)) }
}

/** Every date in the range, inclusive. */
export function eachDay(r: DateRange): string[] {
  const out: string[] = []
  const end = parseISO(r.until)
  for (let d = parseISO(r.since); d <= end; d = addDays(d, 1)) out.push(iso(d))
  return out
}

export type Granularity = 'day' | 'week' | 'month'

export function bucketDate(date: string, g: Granularity): string {
  if (g === 'day') return date
  const d = parseISO(date)
  return iso(g === 'week' ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d))
}

export function formatRange(r: DateRange): string {
  const s = parseISO(r.since)
  const u = parseISO(r.until)
  if (r.since === r.until) return format(s, 'MMM d, yyyy')
  const sameYear = s.getFullYear() === u.getFullYear()
  return `${format(s, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(u, 'MMM d, yyyy')}`
}

export function formatTick(date: string, g: Granularity = 'day'): string {
  const d = parseISO(date)
  return g === 'month' ? format(d, 'MMM yyyy') : format(d, 'MMM d')
}
