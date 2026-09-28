import { METRICS, computeMetric, metricLabel, type MetricContext } from './metrics'
import type { InsightRow } from './types'
import type { Cell, Table } from './export'

/** Round for export: 2 decimals for money/ratios, integers stay integers. */
const round = (v: number | null): Cell => (v === null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100)

export function metricColumns(row: InsightRow, ctx: MetricContext, ids = METRICS.map((m) => m.id)): Record<string, Cell> {
  const out: Record<string, Cell> = {}
  for (const id of ids) out[metricLabel(id, ctx)] = round(computeMetric(id, row, ctx))
  return out
}

export function rowsToTable(
  rows: InsightRow[],
  ctx: MetricContext,
  opts: { dimension?: string; ids?: string[]; withParents?: boolean; status?: Record<string, string> } = {},
): Table {
  return rows.map((r) => {
    const base: Record<string, Cell> = {}
    if (opts.dimension) base[opts.dimension] = r.name
    if (opts.withParents) {
      if (r.adsetName && r.adName) base['Ad set'] = r.adsetName
      if (r.campaignName && (r.adsetName || r.adName)) base['Campaign'] = r.campaignName
    }
    if (opts.status) base['Status'] = opts.status[r.key] ?? null
    if (r.date !== r.dateStop) {
      base['Start'] = r.date
      base['End'] = r.dateStop
    } else base['Date'] = r.date
    return { ...base, ...metricColumns(r, ctx, opts.ids) }
  })
}
