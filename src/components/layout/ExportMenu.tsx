import { useQueryClient } from '@tanstack/react-query'
import { Download, FileJson, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { downloadCsv, downloadJson, downloadXlsx } from '../../lib/export'
import { METRICS, computeMetric, metricLabel, pctChange } from '../../lib/metrics'
import { rowsToTable } from '../../lib/report'
import type { InsightRow, InsightsQuery } from '../../lib/types'
import { insightsKey, useDataSource, useFilters } from '../../hooks/useData'
import { useAuth } from '../../store/auth'
import { Button } from '../ui/Button'
import { MenuItem, MenuLabel, MenuSeparator, Popover } from '../ui/Popover'

export function ExportMenu() {
  const f = useFilters()
  const source = useDataSource()
  const qc = useQueryClient()
  const sourceKey = `${useAuth((s) => s.mode)}:${useAuth((s) => s.user?.id)}`
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Reuse cached queries (same keys as the widgets) and fetch what's missing. */
  const get = (q: Omit<InsightsQuery, 'accountId' | 'campaignIds'>) => {
    const full: InsightsQuery = { ...q, accountId: f.accountId!, campaignIds: f.campaignIds }
    return qc.fetchQuery({ queryKey: insightsKey(sourceKey, full), queryFn: ({ signal }) => source.insights(full, signal), staleTime: 60_000 })
  }

  const base = `meta-ads ${f.account?.name ?? ''} ${f.range.since} to ${f.range.until}`

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const fullReport = () =>
    run(async () => {
      const [totals, prev, daily, campaigns, adsets, ads] = await Promise.all([
        get({ level: 'account', range: f.range }),
        get({ level: 'account', range: f.prevRange }),
        get({ level: 'account', range: f.range, daily: true }),
        get({ level: 'campaign', range: f.range }),
        get({ level: 'adset', range: f.range }),
        get({ level: 'ad', range: f.range }),
      ])
      const summary = METRICS.map((m) => {
        const cur = computeMetric(m.id, totals[0], f.ctx)
        const before = computeMetric(m.id, prev[0], f.ctx)
        const r = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100)
        return { Metric: metricLabel(m.id, f.ctx), [`${f.range.since} – ${f.range.until}`]: r(cur), [`${f.prevRange.since} – ${f.prevRange.until}`]: r(before), 'Change %': r(pctChange(cur, before)) }
      })
      await downloadXlsx(
        [
          { name: 'Summary', rows: summary },
          { name: 'Daily', rows: rowsToTable(daily, f.ctx) },
          { name: 'Campaigns', rows: rowsToTable(bySpend(campaigns), f.ctx, { dimension: 'Campaign' }) },
          { name: 'Ad sets', rows: rowsToTable(bySpend(adsets), f.ctx, { dimension: 'Ad set', withParents: true }) },
          { name: 'Ads', rows: rowsToTable(bySpend(ads), f.ctx, { dimension: 'Ad', withParents: true }) },
        ],
        base,
      )
    })

  return (
    <Popover
      align="end"
      className="w-64"
      trigger={({ toggle }) => (
        <Button onClick={toggle} disabled={!f.accountId || busy} aria-label="Export">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="hidden md:inline">Export</span>
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Report</MenuLabel>
          <MenuItem icon={<FileSpreadsheet />} onClick={() => (close(), fullReport())} hint=".xlsx">
            Full report (Excel)
          </MenuItem>
          <MenuItem
            icon={<FileText />}
            hint=".csv"
            onClick={() => (close(), run(async () => downloadCsv(rowsToTable(bySpend(await get({ level: 'campaign', range: f.range })), f.ctx, { dimension: 'Campaign' }), `${base} campaigns`)))}
          >
            Campaigns
          </MenuItem>
          <MenuItem
            icon={<FileText />}
            hint=".csv"
            onClick={() => (close(), run(async () => downloadCsv(rowsToTable(bySpend(await get({ level: 'ad', range: f.range })), f.ctx, { dimension: 'Ad', withParents: true }), `${base} ads`)))}
          >
            Ads
          </MenuItem>
          <MenuItem
            icon={<FileText />}
            hint=".csv"
            onClick={() => (close(), run(async () => downloadCsv(rowsToTable(await get({ level: 'account', range: f.range, daily: true }), f.ctx), `${base} daily`)))}
          >
            Daily totals
          </MenuItem>
          <MenuItem
            icon={<FileJson />}
            hint=".json"
            onClick={() => (close(), run(async () => downloadJson({ account: f.account, range: f.range, campaigns: await get({ level: 'campaign', range: f.range }) }, `${base} raw`)))}
          >
            Raw data
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Printer />} onClick={() => (close(), setTimeout(() => window.print(), 50))}>
            Print / save as PDF
          </MenuItem>
          {error && <p className="px-2.5 py-2 text-xs text-bad">{error}</p>}
        </>
      )}
    </Popover>
  )
}

const bySpend = (rows: InsightRow[]) => [...rows].sort((a, b) => b.spend - a.spend)
