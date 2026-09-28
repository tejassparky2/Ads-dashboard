import { metricLabel, type MetricContext } from '../../lib/metrics'
import type { Widget, WidgetSize } from '../../store/widgets'
import { BREAKDOWNS } from '../widgets/options'

export const LEVEL_PLURAL = { campaign: 'campaigns', adset: 'ad sets', ad: 'ads' } as const
const LEVEL_TITLE = { campaign: 'Campaign', adset: 'Ad set', ad: 'Ad' } as const

export function widgetTitle(w: Widget, ctx: MetricContext): string {
  if (w.title) return w.title
  switch (w.type) {
    case 'kpi':
      return metricLabel(w.config.metric, ctx)
    case 'trend':
      return w.config.metrics.map((m) => metricLabel(m, ctx)).join(' & ') + ' over time'
    case 'bar':
      return `${w.config.order === 'desc' ? 'Top' : 'Bottom'} ${LEVEL_PLURAL[w.config.level]} by ${metricLabel(w.config.metric, ctx)}`
    case 'breakdown':
      return `${metricLabel(w.config.metric, ctx)} by ${(BREAKDOWNS.find((b) => b.id === w.config.dimension)?.label ?? '').toLowerCase()}`
    case 'funnel':
      return 'Conversion funnel'
    case 'table':
      return `${LEVEL_TITLE[w.config.level]} performance`
  }
}

export function widgetSubtitle(w: Widget): string | undefined {
  switch (w.type) {
    case 'trend': {
      const g = { day: 'Daily', week: 'Weekly', month: 'Monthly' }[w.config.granularity]
      return w.config.comparePrevious && w.config.metrics.length === 1 ? `${g} · vs previous period` : g
    }
    case 'breakdown':
      return w.config.display === 'donut' ? 'Share of total' : undefined
    case 'funnel':
      return 'Step-by-step drop-off'
    default:
      return undefined
  }
}

/** 12-column spans per breakpoint. KPI cards sit two-up on phones. */
export const SPAN: Record<WidgetSize, string> = {
  sm: 'col-span-6 lg:col-span-3',
  md: 'col-span-12 md:col-span-6 xl:col-span-4',
  lg: 'col-span-12 lg:col-span-6',
  xl: 'col-span-12 xl:col-span-8',
  full: 'col-span-12',
}
