import type { Granularity } from '../lib/dates'
import type { BreakdownKey } from '../lib/types'

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: '¼ width',
  md: '⅓ width',
  lg: '½ width',
  xl: '⅔ width',
  full: 'Full width',
}

export interface KpiConfig {
  metric: string
  sparkline: boolean
}
export interface TrendConfig {
  metrics: string[]
  chart: 'line' | 'area' | 'bar'
  granularity: Granularity
  comparePrevious: boolean
}
export interface BarConfig {
  metric: string
  level: 'campaign' | 'adset' | 'ad'
  limit: number
  order: 'desc' | 'asc'
}
export interface BreakdownConfig {
  dimension: BreakdownKey
  metric: string
  display: 'bar' | 'donut'
}
export interface FunnelConfig {
  stages: string[]
}
export interface TableConfig {
  level: 'campaign' | 'adset' | 'ad'
  columns: string[]
  showStatus: boolean
  pageSize: number
}

interface W<T extends string, C> {
  id: string
  type: T
  size: WidgetSize
  title?: string
  config: C
}

export type Widget =
  | W<'kpi', KpiConfig>
  | W<'trend', TrendConfig>
  | W<'bar', BarConfig>
  | W<'breakdown', BreakdownConfig>
  | W<'funnel', FunnelConfig>
  | W<'table', TableConfig>

export type WidgetType = Widget['type']

export const uid = () => Math.random().toString(36).slice(2, 10)

export const WIDGET_CATALOG: { type: WidgetType; name: string; description: string; size: WidgetSize }[] = [
  { type: 'kpi', name: 'KPI card', description: 'One headline number with change vs the previous period and a sparkline.', size: 'sm' },
  { type: 'trend', name: 'Trend chart', description: 'A metric over time as a line, area or column chart, with the previous period overlaid.', size: 'lg' },
  { type: 'bar', name: 'Top performers', description: 'Rank campaigns, ad sets or ads by any metric.', size: 'lg' },
  { type: 'breakdown', name: 'Audience & placement breakdown', description: 'Split results by age, gender, platform, placement, device or country.', size: 'lg' },
  { type: 'funnel', name: 'Conversion funnel', description: 'Drop-off from impressions and clicks through to conversions.', size: 'md' },
  { type: 'table', name: 'Performance table', description: 'Sortable, searchable table with the columns you choose.', size: 'full' },
]

export function defaultWidget(type: WidgetType): Widget {
  const id = uid()
  const size = WIDGET_CATALOG.find((w) => w.type === type)!.size
  switch (type) {
    case 'kpi':
      return { id, type, size, config: { metric: 'spend', sparkline: true } }
    case 'trend':
      return { id, type, size, config: { metrics: ['spend'], chart: 'area', granularity: 'day', comparePrevious: true } }
    case 'bar':
      return { id, type, size, config: { metric: 'spend', level: 'campaign', limit: 8, order: 'desc' } }
    case 'breakdown':
      return { id, type, size, config: { dimension: 'age', metric: 'spend', display: 'bar' } }
    case 'funnel':
      return { id, type, size, config: { stages: ['link_clicks', 'lpv', 'add_to_cart', 'checkouts', 'conversions'] } }
    case 'table':
      return {
        id,
        type,
        size,
        config: {
          level: 'campaign',
          columns: ['spend', 'impressions', 'cplc', 'link_ctr', 'cpm', 'conversions', 'cpa', 'revenue', 'roas'],
          showStatus: true,
          pageSize: 15,
        },
      }
  }
}

const kpi = (metric: string): Widget => ({ id: uid(), type: 'kpi', size: 'sm', config: { metric, sparkline: true } })

export function overviewWidgets(): Widget[] {
  return [
    kpi('spend'),
    kpi('revenue'),
    kpi('roas'),
    kpi('conversions'),
    kpi('cpa'),
    kpi('cplc'),
    kpi('link_ctr'),
    kpi('cpm'),
    { id: uid(), type: 'trend', size: 'xl', title: 'Spend vs conversion value', config: { metrics: ['spend', 'revenue'], chart: 'line', granularity: 'day', comparePrevious: false } },
    { id: uid(), type: 'funnel', size: 'md', config: { stages: ['link_clicks', 'lpv', 'add_to_cart', 'checkouts', 'conversions'] } },
    { id: uid(), type: 'trend', size: 'lg', config: { metrics: ['cpa'], chart: 'area', granularity: 'day', comparePrevious: true } },
    { id: uid(), type: 'bar', size: 'lg', config: { metric: 'roas', level: 'campaign', limit: 8, order: 'desc' } },
    { id: uid(), type: 'breakdown', size: 'lg', config: { dimension: 'age', metric: 'cpa', display: 'bar' } },
    { id: uid(), type: 'breakdown', size: 'lg', config: { dimension: 'publisher_platform', metric: 'spend', display: 'donut' } },
    defaultWidget('table'),
  ]
}

export function creativeWidgets(): Widget[] {
  return [
    kpi('impressions'),
    kpi('reach'),
    kpi('frequency'),
    kpi('hook_rate'),
    { id: uid(), type: 'trend', size: 'lg', config: { metrics: ['link_ctr'], chart: 'line', granularity: 'day', comparePrevious: true } },
    { id: uid(), type: 'trend', size: 'lg', config: { metrics: ['cpm'], chart: 'line', granularity: 'day', comparePrevious: true } },
    { id: uid(), type: 'bar', size: 'lg', config: { metric: 'link_ctr', level: 'ad', limit: 10, order: 'desc' } },
    { id: uid(), type: 'breakdown', size: 'lg', config: { dimension: 'platform_position', metric: 'link_ctr', display: 'bar' } },
    {
      id: uid(),
      type: 'table',
      size: 'full',
      config: { level: 'ad', columns: ['spend', 'impressions', 'frequency', 'hook_rate', 'thruplays', 'link_ctr', 'cplc', 'conversions', 'cpa', 'roas'], showStatus: true, pageSize: 15 },
    },
  ]
}
