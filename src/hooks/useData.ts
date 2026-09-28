import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createMetaSource, demoSource, type DataSource } from '../lib/dataSource'
import { presetRange, previousRange } from '../lib/dates'
import type { MetricContext } from '../lib/metrics'
import type { AdAccount, BreakdownKey, DateRange, InsightsQuery, Level } from '../lib/types'
import { useAuth } from '../store/auth'
import { useSettings } from '../store/settings'

export function useDataSource(): DataSource {
  const mode = useAuth((s) => s.mode)
  const token = useAuth((s) => s.token)
  const apiVersion = useAuth((s) => s.apiVersion)
  return useMemo(
    () => (mode === 'demo' || !mode ? demoSource : createMetaSource(token, apiVersion || undefined)),
    [mode, token, apiVersion],
  )
}

/** Part of every query key so switching accounts/tokens never serves stale data. */
function useSourceKey() {
  const mode = useAuth((s) => s.mode)
  const user = useAuth((s) => s.user?.id)
  return `${mode}:${user}`
}

export function useAccounts() {
  const source = useDataSource()
  const key = useSourceKey()
  return useQuery({
    queryKey: ['accounts', key],
    queryFn: ({ signal }) => source.accounts(signal),
    staleTime: 30 * 60_000,
  })
}

export interface Filters {
  account: AdAccount | undefined
  accountId: string | undefined
  currency: string
  range: DateRange
  prevRange: DateRange
  compare: boolean
  campaignIds: string[]
  activeOnly: boolean
  ctx: MetricContext
}

export function useFilters(): Filters {
  const { data: accounts } = useAccounts()
  const s = useSettings()
  const account = accounts?.find((a) => a.id === s.accountId) ?? accounts?.[0]
  const range = useMemo(
    () => (s.preset === 'custom' && s.customRange ? s.customRange : presetRange(s.preset === 'custom' ? 'last_30d' : s.preset)),
    [s.preset, s.customRange],
  )
  const prevRange = useMemo(() => previousRange(range), [range])
  const ctx = useMemo(() => ({ conversionEvent: s.conversionEvent }), [s.conversionEvent])
  return {
    account,
    accountId: account?.id,
    currency: account?.currency ?? 'USD',
    range,
    prevRange,
    compare: s.compare,
    campaignIds: s.campaignIds,
    activeOnly: s.activeOnly,
    ctx,
  }
}

export function insightsKey(sourceKey: string, q: InsightsQuery) {
  return [
    'insights',
    sourceKey,
    q.accountId,
    q.level,
    q.range.since,
    q.range.until,
    !!q.daily,
    q.breakdown ?? '',
    [...(q.campaignIds ?? [])].sort().join(','),
    !!q.activeOnly,
  ]
}

export function useInsights(
  q: Omit<InsightsQuery, 'accountId' | 'range' | 'campaignIds' | 'activeOnly'> & { period?: 'current' | 'previous' },
  enabled = true,
) {
  const source = useDataSource()
  const key = useSourceKey()
  const f = useFilters()
  const query: InsightsQuery | null = f.accountId
    ? {
        accountId: f.accountId,
        range: q.period === 'previous' ? f.prevRange : f.range,
        level: q.level,
        daily: q.daily,
        breakdown: q.breakdown,
        campaignIds: f.campaignIds,
        activeOnly: f.activeOnly,
      }
    : null
  return useQuery({
    queryKey: query ? insightsKey(key, query) : ['insights', 'none'],
    queryFn: ({ signal }) => source.insights(query!, signal),
    enabled: !!query && enabled,
    placeholderData: keepPreviousData,
  })
}

/** Account totals for the current and (optionally) previous period. */
export function useTotals() {
  const f = useFilters()
  const cur = useInsights({ level: 'account' })
  const prev = useInsights({ level: 'account', period: 'previous' }, f.compare)
  return { current: cur.data?.[0], previous: f.compare ? prev.data?.[0] : undefined, query: cur }
}

export function useDaily(period: 'current' | 'previous' = 'current', enabled = true) {
  return useInsights({ level: 'account', daily: true, period }, enabled)
}

export function useLevel(level: Exclude<Level, 'account'>) {
  return useInsights({ level })
}

export function useBreakdown(breakdown: BreakdownKey) {
  return useInsights({ level: 'account', breakdown })
}

export function useEntities(level: 'campaign' | 'adset' | 'ad', enabled = true) {
  const source = useDataSource()
  const key = useSourceKey()
  const f = useFilters()
  return useQuery({
    queryKey: ['entities', key, f.accountId, level],
    queryFn: ({ signal }) => source.entities(f.accountId!, level, f.currency, signal),
    enabled: !!f.accountId && enabled,
    staleTime: 10 * 60_000,
  })
}
