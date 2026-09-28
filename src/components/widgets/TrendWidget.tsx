import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { bucketDate, eachDay, formatTick, type Granularity } from '../../lib/dates'
import { formatAxis, formatValue } from '../../lib/format'
import { computeMetric, getMetric, metricLabel, sumBase, type MetricContext } from '../../lib/metrics'
import type { ChartTheme } from '../../lib/palette'
import type { BaseMetrics, InsightRow } from '../../lib/types'
import { useDaily, useFilters } from '../../hooks/useData'
import { useChartTheme } from '../../hooks/useTheme'
import type { TrendConfig } from '../../store/widgets'
import { ErrorState, Skeleton } from '../ui/States'
import { useWidgetData } from '../dashboard/widgetData'
import { Legend, TooltipCard } from './chartParts'
import { axisProps } from './options'

/** Sum daily rows into day/week/month buckets, filling empty days. */
function buckets(rows: InsightRow[] | undefined, days: string[], g: Granularity): { date: string; base: BaseMetrics }[] {
  const byDate = new Map<string, InsightRow[]>()
  for (const r of rows ?? []) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r])
  const order: string[] = []
  const groups = new Map<string, InsightRow[]>()
  for (const d of days) {
    const b = bucketDate(d, g)
    if (!groups.has(b)) {
      groups.set(b, [])
      order.push(b)
    }
    groups.get(b)!.push(...(byDate.get(d) ?? []))
  }
  return order.map((date) => ({ date, base: sumBase(groups.get(date)!) }))
}

type Point = Record<string, number | string | null>

export function TrendWidget({ config }: { config: TrendConfig }) {
  const f = useFilters()
  const t = useChartTheme()
  const metrics = useMemo(() => (config.metrics.length ? config.metrics : ['spend']), [config.metrics])
  const single = metrics.length === 1
  const showPrev = single && config.comparePrevious
  const cur = useDaily('current')
  const prev = useDaily('previous', showPrev)

  const data = useMemo<Point[]>(() => {
    const curB = buckets(cur.data, eachDay(f.range), config.granularity)
    const prevB = showPrev ? buckets(prev.data, eachDay(f.prevRange), config.granularity) : []
    return curB.map((b, i) => {
      const p: Point = { date: b.date }
      for (const id of metrics) p[id] = computeMetric(id, b.base, f.ctx)
      if (showPrev) {
        p.__prev = prevB[i] ? computeMetric(metrics[0], prevB[i].base, f.ctx) : null
        p.__prevDate = prevB[i]?.date ?? null
      }
      return p
    })
  }, [cur.data, prev.data, f.range, f.prevRange, f.ctx, config.granularity, metrics, showPrev])

  const table = useMemo(
    () =>
      data.map((p) => {
        const row: Record<string, string | number | null> = { Date: p.date as string }
        for (const id of metrics) row[metricLabel(id, f.ctx)] = p[id] === null ? null : +(+p[id]!).toFixed(4)
        if (showPrev) row[`Previous period`] = p.__prev === null ? null : +(+p.__prev!).toFixed(4)
        return row
      }),
    [data, metrics, f.ctx, showPrev],
  )
  useWidgetData(table)

  if (cur.isError) return <ErrorState error={cur.error} onRetry={() => cur.refetch()} />
  if (!cur.data) return <Skeleton className="h-[240px] w-full" />

  // Different units never share a y-axis: one small multiple per format.
  const groups = new Map<string, string[]>()
  for (const id of metrics) {
    const fmt = getMetric(id).format
    groups.set(fmt, [...(groups.get(fmt) ?? []), id])
  }
  const panels = [...groups.values()]
  const height = panels.length === 1 ? 240 : Math.max(130, Math.round(260 / panels.length) + 20)

  return (
    <div className={`space-y-3 transition-opacity ${cur.isFetching ? 'opacity-60' : ''}`}>
      {(metrics.length > 1 || showPrev) && (
        <Legend
          items={[
            ...metrics.map((id, i) => ({ color: t.series[i], label: metricLabel(id, f.ctx), line: config.chart !== 'bar' })),
            ...(showPrev ? [{ color: t.previous, label: 'Previous period', line: true }] : []),
          ]}
        />
      )}
      {panels.map((ids) => (
        <TrendPanel
          key={ids.join()}
          ids={ids}
          colorIndex={(id) => metrics.indexOf(id)}
          data={data}
          config={config}
          theme={t}
          ctx={f.ctx}
          currency={f.currency}
          height={height}
          showPrev={showPrev}
          showLabel={panels.length > 1}
        />
      ))}
    </div>
  )
}

function TrendPanel({
  ids,
  colorIndex,
  data,
  config,
  theme: t,
  ctx,
  currency,
  height,
  showPrev,
  showLabel,
}: {
  ids: string[]
  colorIndex: (id: string) => number
  data: Point[]
  config: TrendConfig
  theme: ChartTheme
  ctx: MetricContext
  currency: string
  height: number
  showPrev: boolean
  showLabel: boolean
}) {
  const fmt = getMetric(ids[0]).format
  const g = config.granularity
  return (
    <div>
      {showLabel && <div className="mb-1 text-xs font-medium text-fg-2">{ids.map((id) => metricLabel(id, ctx)).join(' · ')}</div>}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={t.grid} />
            <XAxis dataKey="date" {...axisProps(t)} tickFormatter={(d) => formatTick(d, g)} minTickGap={28} interval="preserveStartEnd" />
            <YAxis {...axisProps(t)} width={58} tickFormatter={(v) => formatAxis(v, fmt, currency)} />
            <Tooltip
              cursor={config.chart === 'bar' ? { fill: t.grid, opacity: 0.6 } : { stroke: t.axis, strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={g === 'day' ? formatTick(String(label)) : `${g === 'week' ? 'Week of' : ''} ${formatTick(String(label), g)}`}
                    rows={[
                      ...ids.map((id) => ({
                        color: t.series[colorIndex(id)],
                        name: metricLabel(id, ctx),
                        value: formatValue(payload[0].payload[id] as number | null, getMetric(id).format, { currency }),
                      })),
                      ...(showPrev
                        ? [
                            {
                              color: t.previous,
                              dim: true,
                              name: payload[0].payload.__prevDate ? `Prev. · ${formatTick(String(payload[0].payload.__prevDate), g)}` : 'Previous',
                              value: formatValue(payload[0].payload.__prev as number | null, fmt, { currency }),
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : null
              }
            />
            {showPrev && (
              <Line type="monotone" dataKey="__prev" stroke={t.previous} strokeWidth={1.5} dot={false} activeDot={{ r: 3.5, strokeWidth: 0, fill: t.previous }} isAnimationActive={false} connectNulls />
            )}
            {ids.map((id) => {
              const c = t.series[colorIndex(id)]
              if (config.chart === 'bar')
                return <Bar key={id} dataKey={id} fill={c} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              if (config.chart === 'area')
                return (
                  <Area key={id} type="monotone" dataKey={id} stroke={c} strokeWidth={2} fill={c} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} connectNulls />
                )
              return (
                <Line key={id} type="monotone" dataKey={id} stroke={c} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} connectNulls />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
