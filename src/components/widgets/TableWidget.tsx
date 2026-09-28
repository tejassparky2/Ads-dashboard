import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatValue } from '../../lib/format'
import { computeMetric, getMetric, metricLabel } from '../../lib/metrics'
import { rowsToTable } from '../../lib/report'
import { useEntities, useFilters, useLevel, useTotals } from '../../hooks/useData'
import type { TableConfig } from '../../store/widgets'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { AdPreviewDialog } from './AdPreviewDialog'
import { AdThumbnail } from './AdThumbnail'
import { useWidgetData } from '../dashboard/widgetData'

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-good-soft text-good',
  PAUSED: 'bg-surface-3 text-fg-2',
  CAMPAIGN_PAUSED: 'bg-surface-3 text-fg-2',
  ADSET_PAUSED: 'bg-surface-3 text-fg-2',
  ARCHIVED: 'bg-surface-3 text-muted',
  DELETED: 'bg-surface-3 text-muted',
  WITH_ISSUES: 'bg-bad-soft text-bad',
  DISAPPROVED: 'bg-bad-soft text-bad',
  PENDING_REVIEW: 'bg-warn-soft text-warn',
  IN_PROCESS: 'bg-warn-soft text-warn',
}

const statusLabel = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())

type Sort = { col: string; dir: 'asc' | 'desc' }

function SortIcon({ col, sort }: { col: string; sort: Sort }) {
  if (sort.col !== col) return null
  return sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
}

export function TableWidget({ config }: { config: TableConfig }) {
  const f = useFilters()
  const q = useLevel(config.level)
  const { current: totals } = useTotals()
  // Older saved tables have no showThumbnails flag: default to on.
  const thumbs = config.level === 'ad' && config.showThumbnails !== false
  const entities = useEntities(config.level, config.showStatus || thumbs)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sort, setSort] = useState<Sort>({ col: config.columns[0] ?? 'spend', dir: 'desc' })
  const [limit, setLimit] = useState(config.pageSize)

  const status = useMemo(() => Object.fromEntries((entities.data ?? []).map((e) => [e.id, e.status])), [entities.data])
  const creatives = useMemo(() => new Map((entities.data ?? []).map((e) => [e.id, e.creative])), [entities.data])

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    let out = (q.data ?? []).filter(
      (r) => !s || r.name.toLowerCase().includes(s) || r.campaignName?.toLowerCase().includes(s) || r.adsetName?.toLowerCase().includes(s),
    )
    if (config.showStatus && statusFilter !== 'all') {
      out = out.filter((r) => (status[r.key] === 'ACTIVE') === (statusFilter === 'active'))
    }
    const val = (r: (typeof out)[number]) =>
      sort.col === '__name' ? r.name.toLowerCase() : sort.col === '__status' ? (status[r.key] ?? '') : (computeMetric(sort.col, r, f.ctx) ?? -Infinity)
    return [...out].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      const c = x < y ? -1 : x > y ? 1 : 0
      return sort.dir === 'asc' ? c : -c
    })
  }, [q.data, search, sort, f.ctx, status, statusFilter, config.showStatus])

  const table = useMemo(
    () => rowsToTable(rows, f.ctx, { dimension: 'Name', ids: config.columns, withParents: true, status: config.showStatus ? status : undefined }),
    [rows, f.ctx, config.columns, config.showStatus, status],
  )
  useWidgetData(table)

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!q.data) return <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>

  const toggleSort = (col: string) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: col === '__name' ? 'asc' : 'desc' }))

  const levelName = config.level === 'campaign' ? 'Campaign' : config.level === 'adset' ? 'Ad set' : 'Ad'
  const shown = rows.slice(0, limit)
  const previewRow = previewKey ? q.data?.find((r) => r.key === previewKey) : undefined

  return (
    <div className={`transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2" data-export-ignore>
        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${levelName.toLowerCase()}s…`}
            className="h-9 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-8 text-sm outline-none focus:border-accent"
          />
        </div>
        {config.showStatus && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-9 cursor-pointer rounded-lg border border-line-strong bg-surface px-2 text-sm"
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Not active</option>
          </select>
        )}
        <span className="ml-auto text-xs text-muted">
          {rows.length} {levelName.toLowerCase()}
          {rows.length === 1 ? '' : 's'}
        </span>
      </div>
      {!rows.length ? (
        <EmptyState>No {levelName.toLowerCase()}s with delivery match.</EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="tabular w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="sticky left-0 z-10 min-w-48 border-b border-line bg-surface py-2 pr-3 pl-4 font-medium sm:pl-5">
                  <button type="button" onClick={() => toggleSort('__name')} className="inline-flex cursor-pointer items-center gap-1 hover:text-fg">
                    {levelName} <SortIcon col="__name" sort={sort} />
                  </button>
                </th>
                {config.showStatus && (
                  <th className="border-b border-line px-3 py-2 font-medium">
                    <button type="button" onClick={() => toggleSort('__status')} className="inline-flex cursor-pointer items-center gap-1 hover:text-fg">
                      Status <SortIcon col="__status" sort={sort} />
                    </button>
                  </th>
                )}
                {config.columns.map((id) => (
                  <th key={id} className="border-b border-line px-3 py-2 text-right font-medium whitespace-nowrap last:pr-4 sm:last:pr-5">
                    <button
                      type="button"
                      onClick={() => toggleSort(id)}
                      title={getMetric(id).description}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-fg"
                    >
                      <SortIcon col={id} sort={sort} />
                      {id === 'conversions' || id === 'cpa' ? metricLabel(id, f.ctx) : getMetric(id).short}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="group">
                  <td className="sticky left-0 z-10 max-w-72 border-b border-line bg-surface py-2.5 pr-3 pl-4 group-hover:bg-surface-2 sm:pl-5">
                    <div className="flex items-center gap-3">
                      {thumbs && <AdThumbnail creative={creatives.get(r.key)} name={r.name} onClick={() => setPreviewKey(r.key)} />}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-fg" title={r.name}>
                          {r.name}
                        </div>
                        {config.level !== 'campaign' && (
                          <div className="truncate text-[11px] text-muted" title={r.campaignName}>
                            {config.level === 'ad' ? `${r.adsetName} · ` : ''}
                            {r.campaignName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {config.showStatus && (
                    <td className="border-b border-line px-3 py-2.5 group-hover:bg-surface-2">
                      {status[r.key] ? (
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[status[r.key]] ?? 'bg-surface-3 text-fg-2'}`}>
                          {statusLabel(status[r.key])}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {config.columns.map((id) => (
                    <td key={id} className="border-b border-line px-3 py-2.5 text-right whitespace-nowrap group-hover:bg-surface-2 last:pr-4 sm:last:pr-5">
                      {formatValue(computeMetric(id, r, f.ctx), getMetric(id).format, { currency: f.currency })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && !search && statusFilter === 'all' && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="sticky left-0 z-10 bg-surface py-2.5 pr-3 pl-4 sm:pl-5">Total</td>
                  {config.showStatus && <td />}
                  {config.columns.map((id) => (
                    <td key={id} className="px-3 py-2.5 text-right whitespace-nowrap last:pr-4 sm:last:pr-5">
                      {formatValue(computeMetric(id, totals, f.ctx), getMetric(id).format, { currency: f.currency })}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      {previewRow && (
        <AdPreviewDialog
          row={previewRow}
          creative={creatives.get(previewRow.key)}
          status={status[previewRow.key]}
          metrics={config.columns.slice(0, 9)}
          ctx={f.ctx}
          currency={f.currency}
          onClose={() => setPreviewKey(null)}
        />
      )}
      {rows.length > limit && (
        <div className="mt-3 flex justify-center" data-export-ignore>
          <button type="button" onClick={() => setLimit((l) => l + config.pageSize)} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft">
            Show {Math.min(config.pageSize, rows.length - limit)} more
          </button>
        </div>
      )}
    </div>
  )
}
