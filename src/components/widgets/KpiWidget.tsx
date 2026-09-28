import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { formatDelta, formatValue } from '../../lib/format'
import { computeMetric, deltaTone, getMetric, metricLabel, pctChange } from '../../lib/metrics'
import { eachDay } from '../../lib/dates'
import { useDaily, useFilters, useTotals } from '../../hooks/useData'
import { useChartTheme } from '../../hooks/useTheme'
import type { KpiConfig } from '../../store/widgets'
import { ErrorState, Skeleton } from '../ui/States'
import { useWidgetData } from '../dashboard/widgetData'

const TONE = {
  good: 'bg-good-soft text-good',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-surface-3 text-fg-2',
}

export function KpiWidget({ config }: { config: KpiConfig }) {
  const f = useFilters()
  const t = useChartTheme()
  const { current, previous, query } = useTotals()
  const daily = useDaily('current', config.sparkline)
  const m = getMetric(config.metric)

  const value = computeMetric(config.metric, current, f.ctx)
  const prevValue = computeMetric(config.metric, previous, f.ctx)
  const delta = f.compare ? pctChange(value, prevValue) : null
  const tone = deltaTone(config.metric, delta)

  const spark = useMemo(() => {
    if (!config.sparkline || !daily.data) return []
    const byDate = new Map(daily.data.map((r) => [r.date, r]))
    return eachDay(f.range).map((d) => ({ d, v: computeMetric(config.metric, byDate.get(d), f.ctx) }))
  }, [config.sparkline, config.metric, daily.data, f.range, f.ctx])

  const table = useMemo(
    () => [
      {
        Metric: metricLabel(config.metric, f.ctx),
        Current: value === null ? null : +value.toFixed(4),
        Previous: prevValue === null ? null : +prevValue.toFixed(4),
        'Change %': delta === null ? null : +delta.toFixed(2),
      },
    ],
    [config.metric, f.ctx, value, prevValue, delta],
  )
  useWidgetData(table)

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!current && query.isPending) {
    return (
      <div className="space-y-3 pt-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  const Arrow = delta === null || Math.abs(delta) < 0.05 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`@container flex h-full flex-col transition-opacity ${query.isFetching ? 'opacity-60' : ''}`}>
      <div className="truncate text-[20px] leading-tight font-semibold tracking-tight text-fg @[190px]:text-[24px] @[240px]:text-[28px]">
        {formatValue(value, m.format, { currency: f.currency, compact: (value ?? 0) >= 100000 })}
      </div>
      {f.compare && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${TONE[tone]}`}>
            <Arrow className="h-3.5 w-3.5" aria-hidden />
            {formatDelta(delta)}
          </span>
          <span className="text-muted">
            vs {formatValue(prevValue, m.format, { currency: f.currency, compact: true })}
          </span>
        </div>
      )}
      {config.sparkline && spark.length > 1 && (
        <div className="-mx-1 mt-auto h-10 pt-2" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={t.series[0]}
                strokeWidth={1.5}
                fill={t.series[0]}
                fillOpacity={0.1}
                isAnimationActive={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
