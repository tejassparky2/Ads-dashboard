import { useMemo } from 'react'
import { formatValue } from '../../lib/format'
import { computeMetric, metricLabel } from '../../lib/metrics'
import { useFilters, useTotals } from '../../hooks/useData'
import { useChartTheme } from '../../hooks/useTheme'
import type { FunnelConfig } from '../../store/widgets'
import { ErrorState, Skeleton } from '../ui/States'
import { useWidgetData } from '../dashboard/widgetData'

export function FunnelWidget({ config }: { config: FunnelConfig }) {
  const f = useFilters()
  const t = useChartTheme()
  const { current, query } = useTotals()

  const stages = useMemo(
    () =>
      config.stages.map((id) => ({
        id,
        label: metricLabel(id, f.ctx),
        value: computeMetric(id, current, f.ctx) ?? 0,
      })),
    [config.stages, current, f.ctx],
  )

  const table = useMemo(
    () =>
      stages.map((s, i) => ({
        Stage: s.label,
        Count: s.value,
        'Step conversion %': i === 0 || !stages[i - 1].value ? null : +((s.value / stages[i - 1].value) * 100).toFixed(2),
        'Of first stage %': !stages[0].value ? null : +((s.value / stages[0].value) * 100).toFixed(2),
      })),
    [stages],
  )
  useWidgetData(table)

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!current) return <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>

  const top = stages[0]?.value || 1
  // Ordinal ramp: later stages darker. Spread the ramp across however many stages there are.
  const color = (i: number) => t.ordinal[Math.round((i / Math.max(1, stages.length - 1)) * (t.ordinal.length - 1))]

  return (
    <ol className={`space-y-1 transition-opacity ${query.isFetching ? 'opacity-60' : ''}`}>
      {stages.map((s, i) => {
        const prev = stages[i - 1]
        const step = prev && prev.value > 0 ? (s.value / prev.value) * 100 : null
        return (
          <li key={s.id}>
            {i > 0 && (
              <div className="flex items-center gap-1.5 py-0.5 pl-1 text-[11px] text-muted">
                <span aria-hidden>↓</span>
                <span className="tabular">{step === null ? '—' : `${step.toFixed(step < 10 ? 2 : 1)}%`}</span>
                <span>continue</span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-fg-2">{s.label}</span>
              <span className="tabular font-semibold">{formatValue(s.value, 'int', { compact: true })}</span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded-r-full" style={{ background: t.grid }}>
              <div
                className="h-2.5 rounded-r-full transition-[width] duration-500"
                style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%`, background: color(i) }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
