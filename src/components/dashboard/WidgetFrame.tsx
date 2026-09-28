import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileDown,
  GripVertical,
  ImageDown,
  MoreHorizontal,
  Settings2,
  Table2,
  BarChart3,
  Trash2,
} from 'lucide-react'
import { useCallback, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { downloadPng, type Table } from '../../lib/export'
import { usePdfExport } from '../../hooks/usePdfExport'
import { useChartTheme } from '../../hooks/useTheme'
import { useFilters } from '../../hooks/useData'
import { formatRange } from '../../lib/dates'
import { useDashboard } from '../../store/dashboard'
import type { Widget } from '../../store/widgets'
import { Button } from '../ui/Button'
import { MenuItem, MenuSeparator, Popover } from '../ui/Popover'
import { WidgetDataContext } from './widgetData'
import { widgetSubtitle, widgetTitle } from './widgetMeta'

interface Props {
  widget: Widget
  index: number
  total: number
  editing: boolean
  handleProps?: HTMLAttributes<HTMLButtonElement>
  onConfigure: () => void
  children: ReactNode
}

export function WidgetFrame({ widget, index, total, editing, handleProps, onConfigure, children }: Props) {
  const f = useFilters()
  const t = useChartTheme()
  const { removeWidget, duplicateWidget, shiftWidget } = useDashboard()
  const exportPdf = usePdfExport()
  const [data, setData] = useState<Table>([])
  const [tableView, setTableView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const publish = useCallback((tb: Table) => setData(tb), [])

  const title = widgetTitle(widget, f.ctx)
  const subtitle = widgetSubtitle(widget)
  const isKpi = widget.type === 'kpi'
  const canTable = widget.type !== 'table' && widget.type !== 'kpi'
  const fileBase = `${title} ${f.range.since} to ${f.range.until}`

  return (
    <section
      ref={ref}
      data-widget={widget.id}
      aria-label={title}
      className={`print-card group/w relative flex h-full flex-col rounded-2xl border bg-surface shadow-card transition ${editing ? 'border-dashed border-line-strong' : 'border-line'} ${isKpi ? 'p-4' : 'p-4 sm:p-5'}`}
    >
      <header className={`flex items-start gap-2 ${isKpi ? 'mb-2' : 'mb-4'}`}>
        {editing && (
          <button
            type="button"
            {...handleProps}
            aria-label={`Drag to move ${title}`}
            className="-ml-1.5 flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
            data-export-ignore
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-medium ${isKpi ? 'text-[13px] text-fg-2' : 'text-[15px] text-fg'}`} title={title}>
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
        </div>
        <div className={`flex shrink-0 items-center gap-0.5 print:hidden ${editing ? '' : 'opacity-100 sm:opacity-0 sm:group-hover/w:opacity-100 sm:focus-within:opacity-100'}`} data-export-ignore>
          {editing && (
            <Button variant="ghost" size="icon-sm" onClick={onConfigure} aria-label="Configure widget" className="!h-7 !w-7">
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          <Popover
            align="end"
            className="w-56"
            trigger={({ toggle }) => (
              <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Widget options" className="!h-7 !w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Settings2 />} onClick={() => (close(), onConfigure())}>
                  Configure
                </MenuItem>
                {canTable && (
                  <MenuItem icon={tableView ? <BarChart3 /> : <Table2 />} onClick={() => (close(), setTableView((v) => !v))}>
                    {tableView ? 'View as chart' : 'View as table'}
                  </MenuItem>
                )}
                <MenuSeparator />
                <MenuItem
                  icon={<FileDown />}
                  onClick={() => {
                    close()
                    if (ref.current) {
                      const r = ref.current.getBoundingClientRect()
                      void exportPdf({ elements: [ref.current], name: title, orientation: r.width >= r.height ? 'landscape' : 'portrait' })
                    }
                  }}
                >
                  Download PDF
                </MenuItem>
                <MenuItem
                  icon={<ImageDown />}
                  onClick={() => {
                    close()
                    if (ref.current) void downloadPng(ref.current, fileBase, t.surface)
                  }}
                >
                  Download PNG
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={<Copy />} onClick={() => (close(), duplicateWidget(widget.id))}>
                  Duplicate
                </MenuItem>
                {index > 0 && (
                  <MenuItem icon={<ArrowUp />} onClick={() => (close(), shiftWidget(widget.id, -1))}>
                    Move earlier
                  </MenuItem>
                )}
                {index < total - 1 && (
                  <MenuItem icon={<ArrowDown />} onClick={() => (close(), shiftWidget(widget.id, 1))}>
                    Move later
                  </MenuItem>
                )}
                <MenuItem icon={<Trash2 />} danger onClick={() => (close(), removeWidget(widget.id))}>
                  Remove
                </MenuItem>
              </>
            )}
          </Popover>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <WidgetDataContext.Provider value={publish}>
          <div className={tableView ? 'hidden' : 'h-full'}>{children}</div>
        </WidgetDataContext.Provider>
        {tableView && <DataTableView rows={data} />}
      </div>
      {/* Hidden caption so PNG exports carry their context. */}
      <p className="sr-only">{formatRange(f.range)}</p>
    </section>
  )
}

function DataTableView({ rows }: { rows: Table }) {
  if (!rows.length) return <p className="text-sm text-muted">No data.</p>
  const headers = Object.keys(rows[0])
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-line">
      <table className="tabular w-full text-xs">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-2.5 py-2 text-left font-medium whitespace-nowrap text-fg-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {headers.map((h) => (
                <td key={h} className="px-2.5 py-1.5 whitespace-nowrap">
                  {typeof r[h] === 'number' ? (r[h] as number).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (r[h] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
