import { useMemo } from 'react'
import { formatValue } from '../../lib/format'
import { computeMetric, getMetric, metricLabel } from '../../lib/metrics'
import { rowsToTable } from '../../lib/report'
import { useFilters, useLevel } from '../../hooks/useData'
import { useChartTheme } from '../../hooks/useTheme'
import type { BarConfig } from '../../store/widgets'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { useWidgetData } from '../dashboard/widgetData'
import { BarList } from './chartParts'

export function BarWidget({ config }: { config: BarConfig }) {
  const f = useFilters()
  const t = useChartTheme()
  const q = useLevel(config.level)
  const m = getMetric(config.metric)

  const ranked = useMemo(() => {
    const rows = (q.data ?? [])
      .map((r) => ({ r, v: computeMetric(config.metric, r, f.ctx) }))
      // Ratios on tiny volumes are noise; ignore entities with no spend.
      .filter((x) => x.v !== null && x.r.spend > 0)
    rows.sort((a, b) => (config.order === 'desc' ? b.v! - a.v! : a.v! - b.v!))
    return rows.slice(0, config.limit)
  }, [q.data, config.metric, config.order, config.limit, f.ctx])

  const table = useMemo(
    () => rowsToTable(ranked.map((x) => x.r), f.ctx, { dimension: 'Name', withParents: true }),
    [ranked, f.ctx],
  )
  useWidgetData(table)

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!q.data) return <div className="space-y-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-7" />)}</div>
  if (!ranked.length) return <EmptyState>No delivery in this period.</EmptyState>

  const secondary = config.metric === 'spend' ? 'conversions' : 'spend'
  return (
    <div className={`transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
      <BarList
        trackColor={t.grid}
        items={ranked.map(({ r, v }) => ({
          key: r.key,
          name: r.name,
          sub: [
            config.level !== 'campaign' ? r.campaignName : null,
            `${metricLabel(secondary, f.ctx)} ${formatValue(computeMetric(secondary, r, f.ctx), getMetric(secondary).format, { currency: f.currency, compact: true })}`,
          ]
            .filter(Boolean)
            .join(' · '),
          value: v,
          label: formatValue(v, m.format, { currency: f.currency, compact: true }),
          color: t.series[0],
        }))}
      />
    </div>
  )
}
