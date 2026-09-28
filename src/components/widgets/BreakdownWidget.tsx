import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatValue } from '../../lib/format'
import { computeMetric, getMetric, sumBase } from '../../lib/metrics'
import { rowsToTable } from '../../lib/report'
import type { InsightRow } from '../../lib/types'
import { useBreakdown, useFilters } from '../../hooks/useData'
import { useChartTheme } from '../../hooks/useTheme'
import type { BreakdownConfig } from '../../store/widgets'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { useWidgetData } from '../dashboard/widgetData'
import { BarList, TooltipCard } from './chartParts'
import { BREAKDOWNS } from './options'

const MAX_SLICES = 6

/** Merge rows that share a key (the API returns one per campaign filter chunk etc.). */
function merge(rows: InsightRow[]): InsightRow[] {
  const map = new Map<string, InsightRow[]>()
  for (const r of rows) map.set(r.key, [...(map.get(r.key) ?? []), r])
  return [...map.values()].map((rs) => ({ ...rs[0], ...sumBase(rs) }))
}

export function BreakdownWidget({ config }: { config: BreakdownConfig }) {
  const f = useFilters()
  const t = useChartTheme()
  const q = useBreakdown(config.dimension)
  const m = getMetric(config.metric)
  const donut = config.display === 'donut' && m.additive

  const rows = useMemo(() => merge(q.data ?? []).filter((r) => r.impressions > 0), [q.data])
  // Colour follows the entity: slots assigned by a stable key order, not by rank.
  const colorOf = useMemo(() => {
    const keys = rows.map((r) => r.key).sort()
    return (key: string) => t.series[keys.indexOf(key) % t.series.length]
  }, [rows, t.series])

  const ranked = useMemo(
    () =>
      rows
        .map((r) => ({ r, v: computeMetric(config.metric, r, f.ctx) }))
        .filter((x) => x.v !== null)
        .sort((a, b) => (config.dimension === 'age' ? a.r.key.localeCompare(b.r.key) : b.v! - a.v!)),
    [rows, config.metric, config.dimension, f.ctx],
  )

  const table = useMemo(
    () => rowsToTable(ranked.map((x) => x.r), f.ctx, { dimension: BREAKDOWNS.find((b) => b.id === config.dimension)?.label }),
    [ranked, f.ctx, config.dimension],
  )
  useWidgetData(table)

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!q.data) return <Skeleton className="h-[220px] w-full" />
  if (!ranked.length) return <EmptyState>No data for this breakdown.</EmptyState>

  const fmt = (v: number | null) => formatValue(v, m.format, { currency: f.currency, compact: true })

  if (!donut) {
    return (
      <div className={`transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
        <BarList
          trackColor={t.grid}
          items={ranked.slice(0, 10).map(({ r, v }) => ({
            key: r.key,
            name: r.name,
            value: v,
            label: fmt(v),
            color: t.series[0],
            sub: config.metric === 'spend' ? undefined : `Spend ${formatValue(r.spend, 'currency', { currency: f.currency, compact: true })}`,
          }))}
        />
      </div>
    )
  }

  const byValue = [...ranked].sort((a, b) => b.v! - a.v!)
  const head = byValue.slice(0, MAX_SLICES - (byValue.length > MAX_SLICES ? 1 : 0))
  const tail = byValue.slice(head.length)
  const total = byValue.reduce((s, x) => s + x.v!, 0)
  const slices = [
    ...head.map(({ r, v }) => ({ key: r.key, name: r.name, value: v!, color: colorOf(r.key) })),
    ...(tail.length ? [{ key: '__other', name: `Other (${tail.length})`, value: tail.reduce((s, x) => s + x.v!, 0), color: t.other }] : []),
  ]

  return (
    <div className={`flex flex-col items-center gap-4 transition-opacity sm:flex-row ${q.isFetching ? 'opacity-60' : ''}`}>
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" stroke={t.surface} strokeWidth={2} cornerRadius={3} isAnimationActive={false}>
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(payload[0].name)}
                    rows={[
                      {
                        color: (payload[0].payload as { color: string }).color,
                        name: `${((Number(payload[0].value) / total) * 100).toFixed(1)}% share`,
                        value: fmt(Number(payload[0].value)),
                      },
                    ]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted">Total</span>
          <span className="text-base font-semibold">{fmt(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-[13px]">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-fg-2">{s.name}</span>
            <span className="tabular text-muted">{total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : '—'}</span>
            <span className="tabular w-20 text-right font-medium">{fmt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
