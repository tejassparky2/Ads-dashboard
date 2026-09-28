import { conversionKey, eventKey, eventLabel } from './events'
import type { MetricFormat } from './format'
import type { BaseMetrics } from './types'

export interface MetricContext {
  /** Canonical event id (`purchase`) or `custom:<action_type>`. */
  conversionEvent: string
}

export interface MetricDef {
  id: string
  label: string
  /** Column header / compact label. */
  short: string
  description: string
  format: MetricFormat
  /** Which direction is an improvement – drives delta colouring. */
  good: 'up' | 'down' | 'neutral'
  /** Sums meaningfully across rows (usable for share-of-total charts). */
  additive: boolean
  group: 'Delivery' | 'Engagement' | 'Cost' | 'Conversions' | 'Video'
  compute: (b: BaseMetrics, ctx: MetricContext) => number | null
}

const div = (a: number, b: number) => (b > 0 ? a / b : null)
const act = (b: BaseMetrics, id: string) => b.actions[eventKey(id)] ?? 0
const conv = (b: BaseMetrics, ctx: MetricContext) => b.actions[conversionKey(ctx.conversionEvent)] ?? 0
const convValue = (b: BaseMetrics, ctx: MetricContext) => b.actionValues[conversionKey(ctx.conversionEvent)] ?? 0

export const METRICS: MetricDef[] = [
  // Delivery
  { id: 'spend', label: 'Amount spent', short: 'Spend', description: 'Total amount spent.', format: 'currency', good: 'neutral', additive: true, group: 'Delivery', compute: (b) => b.spend },
  { id: 'impressions', label: 'Impressions', short: 'Impr.', description: 'Times your ads were on screen.', format: 'int', good: 'up', additive: true, group: 'Delivery', compute: (b) => b.impressions },
  { id: 'reach', label: 'Reach', short: 'Reach', description: 'Accounts that saw your ads at least once. Not additive across days or entities.', format: 'int', good: 'up', additive: false, group: 'Delivery', compute: (b) => b.reach },
  { id: 'frequency', label: 'Frequency', short: 'Freq.', description: 'Average times each person saw your ad (impressions ÷ reach).', format: 'decimal', good: 'neutral', additive: false, group: 'Delivery', compute: (b) => div(b.impressions, b.reach) },
  { id: 'cpm', label: 'CPM', short: 'CPM', description: 'Cost per 1,000 impressions.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => (b.impressions > 0 ? (b.spend / b.impressions) * 1000 : null) },

  // Engagement
  { id: 'clicks', label: 'Clicks (all)', short: 'Clicks', description: 'All clicks on your ads, including likes and profile clicks.', format: 'int', good: 'up', additive: true, group: 'Engagement', compute: (b) => b.clicks },
  { id: 'link_clicks', label: 'Link clicks', short: 'Link clicks', description: 'Clicks on links that lead to destinations.', format: 'int', good: 'up', additive: true, group: 'Engagement', compute: (b) => b.linkClicks },
  { id: 'ctr', label: 'CTR (all)', short: 'CTR', description: 'Clicks (all) ÷ impressions.', format: 'percent', good: 'up', additive: false, group: 'Engagement', compute: (b) => (b.impressions > 0 ? (b.clicks / b.impressions) * 100 : null) },
  { id: 'link_ctr', label: 'Link CTR', short: 'Link CTR', description: 'Link clicks ÷ impressions.', format: 'percent', good: 'up', additive: false, group: 'Engagement', compute: (b) => (b.impressions > 0 ? (b.linkClicks / b.impressions) * 100 : null) },
  { id: 'cpc', label: 'CPC (all)', short: 'CPC', description: 'Spend ÷ clicks (all).', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, b.clicks) },
  { id: 'cplc', label: 'CPC (link)', short: 'CPC link', description: 'Spend ÷ link clicks.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, b.linkClicks) },
  { id: 'lpv', label: 'Landing page views', short: 'LPV', description: 'Loads of your landing page after a link click.', format: 'int', good: 'up', additive: true, group: 'Engagement', compute: (b) => act(b, 'landing_page_view') },
  { id: 'cost_per_lpv', label: 'Cost per landing page view', short: 'Cost/LPV', description: 'Spend ÷ landing page views.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, act(b, 'landing_page_view')) },
  { id: 'engagements', label: 'Post engagements', short: 'Engagements', description: 'Reactions, comments, shares, saves and clicks.', format: 'int', good: 'up', additive: true, group: 'Engagement', compute: (b) => act(b, 'post_engagement') },

  // Conversions (driven by the chosen conversion event)
  { id: 'conversions', label: 'Conversions', short: 'Conv.', description: 'Count of your selected conversion event.', format: 'int', good: 'up', additive: true, group: 'Conversions', compute: conv },
  { id: 'cpa', label: 'CPA', short: 'CPA', description: 'Cost per conversion (spend ÷ conversions).', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b, c) => div(b.spend, conv(b, c)) },
  { id: 'cvr', label: 'Conversion rate', short: 'CVR', description: 'Conversions ÷ link clicks.', format: 'percent', good: 'up', additive: false, group: 'Conversions', compute: (b, c) => (b.linkClicks > 0 ? (conv(b, c) / b.linkClicks) * 100 : null) },
  { id: 'revenue', label: 'Conversion value', short: 'Revenue', description: 'Value reported for your selected conversion event.', format: 'currency', good: 'up', additive: true, group: 'Conversions', compute: convValue },
  { id: 'roas', label: 'ROAS', short: 'ROAS', description: 'Return on ad spend (conversion value ÷ spend).', format: 'multiplier', good: 'up', additive: false, group: 'Conversions', compute: (b, c) => div(convValue(b, c), b.spend) },
  { id: 'aov', label: 'Average order value', short: 'AOV', description: 'Conversion value ÷ conversions.', format: 'currency', good: 'up', additive: false, group: 'Conversions', compute: (b, c) => div(convValue(b, c), conv(b, c)) },
  { id: 'purchases', label: 'Purchases', short: 'Purchases', description: 'Purchase events (website, app and on-Meta).', format: 'int', good: 'up', additive: true, group: 'Conversions', compute: (b) => act(b, 'purchase') },
  { id: 'cost_per_purchase', label: 'Cost per purchase', short: 'Cost/purch.', description: 'Spend ÷ purchases.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, act(b, 'purchase')) },
  { id: 'add_to_cart', label: 'Adds to cart', short: 'ATC', description: 'Add-to-cart events.', format: 'int', good: 'up', additive: true, group: 'Conversions', compute: (b) => act(b, 'add_to_cart') },
  { id: 'cost_per_atc', label: 'Cost per add to cart', short: 'Cost/ATC', description: 'Spend ÷ adds to cart.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, act(b, 'add_to_cart')) },
  { id: 'checkouts', label: 'Checkouts initiated', short: 'Checkouts', description: 'Initiate-checkout events.', format: 'int', good: 'up', additive: true, group: 'Conversions', compute: (b) => act(b, 'initiate_checkout') },
  { id: 'leads', label: 'Leads', short: 'Leads', description: 'Lead events (forms and website).', format: 'int', good: 'up', additive: true, group: 'Conversions', compute: (b) => act(b, 'lead') },
  { id: 'cpl', label: 'Cost per lead', short: 'CPL', description: 'Spend ÷ leads.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, act(b, 'lead')) },

  // Video
  { id: 'video_views', label: '3-second video views', short: '3s views', description: 'Video plays of at least 3 seconds.', format: 'int', good: 'up', additive: true, group: 'Video', compute: (b) => act(b, 'video_view') },
  { id: 'hook_rate', label: 'Hook rate', short: 'Hook rate', description: '3-second video views ÷ impressions.', format: 'percent', good: 'up', additive: false, group: 'Video', compute: (b) => (b.impressions > 0 ? (act(b, 'video_view') / b.impressions) * 100 : null) },
  { id: 'thruplays', label: 'ThruPlays', short: 'ThruPlays', description: 'Video plays to completion or at least 15 seconds.', format: 'int', good: 'up', additive: true, group: 'Video', compute: (b) => b.actions['video_thruplay'] ?? 0 },
  { id: 'cost_per_thruplay', label: 'Cost per ThruPlay', short: 'Cost/ThruPlay', description: 'Spend ÷ ThruPlays.', format: 'currency', good: 'down', additive: false, group: 'Cost', compute: (b) => div(b.spend, b.actions['video_thruplay'] ?? 0) },
]

export const METRIC_MAP: Record<string, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.id, m]))

export const METRIC_GROUPS: MetricDef['group'][] = ['Delivery', 'Engagement', 'Cost', 'Conversions', 'Video']

export function getMetric(id: string): MetricDef {
  return METRIC_MAP[id] ?? METRICS[0]
}

/** Metric label, with the conversion event name spliced in where relevant. */
export function metricLabel(id: string, ctx: MetricContext): string {
  const m = getMetric(id)
  if (id === 'conversions') return eventLabel(ctx.conversionEvent)
  if (id === 'cpa') return `CPA · ${eventLabel(ctx.conversionEvent).toLowerCase()}`
  return m.label
}

export function computeMetric(id: string, b: BaseMetrics | undefined, ctx: MetricContext): number | null {
  if (!b) return null
  return getMetric(id).compute(b, ctx)
}

export function emptyBase(): BaseMetrics {
  return { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, actions: {}, actionValues: {} }
}

/**
 * Sum rows into one BaseMetrics. Reach is summed too, which over-counts
 * people reached on several days/entities – prefer an API total row for reach.
 */
export function sumBase(rows: BaseMetrics[]): BaseMetrics {
  const out = emptyBase()
  for (const r of rows) {
    out.spend += r.spend
    out.impressions += r.impressions
    out.reach += r.reach
    out.clicks += r.clicks
    out.linkClicks += r.linkClicks
    for (const [k, v] of Object.entries(r.actions)) out.actions[k] = (out.actions[k] ?? 0) + v
    for (const [k, v] of Object.entries(r.actionValues)) out.actionValues[k] = (out.actionValues[k] ?? 0) + v
  }
  return out
}

/** Percent change from `prev` to `cur`, or null when undefined. */
export function pctChange(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

/** 'good' | 'bad' | 'neutral' for a delta on this metric. */
export function deltaTone(id: string, pct: number | null): 'good' | 'bad' | 'neutral' {
  if (pct === null || Math.abs(pct) < 0.05) return 'neutral'
  const g = getMetric(id).good
  if (g === 'neutral') return 'neutral'
  return (pct > 0) === (g === 'up') ? 'good' : 'bad'
}
