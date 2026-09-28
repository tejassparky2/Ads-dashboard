import type { ReactNode } from 'react'

export interface TooltipRow {
  color: string
  name: string
  value: string
  dim?: boolean
}

export function TooltipCard({ title, rows, footer }: { title: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <div className="mb-1.5 font-medium text-fg">{title}</div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className={`flex-1 ${r.dim ? 'text-muted' : 'text-fg-2'}`}>{r.name}</span>
            <span className="tabular font-medium text-fg">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-line pt-1.5 text-muted">{footer}</div>}
    </div>
  )
}

export function Legend({ items }: { items: { color: string; label: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-2">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.line ? (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: it.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  )
}

export interface BarItem {
  key: string
  name: string
  sub?: string
  value: number | null
  label: string
  color: string
}

/** Horizontal bars in HTML: responsive, readable on phones, value at the tip. */
export function BarList({ items, trackColor }: { items: BarItem[]; trackColor: string }) {
  const max = Math.max(0, ...items.map((i) => i.value ?? 0))
  return (
    <ol className="space-y-3">
      {items.map((it) => {
        const pct = max > 0 && it.value !== null ? Math.max(1.5, (it.value / max) * 100) : 0
        return (
          <li key={it.key} className="group">
            <div className="mb-1 flex items-baseline gap-3 text-[13px]">
              <span className="min-w-0 flex-1 truncate text-fg" title={it.name}>
                {it.name}
              </span>
              <span className="tabular shrink-0 font-semibold text-fg">{it.label}</span>
            </div>
            <div className="h-2 w-full rounded-r-full" style={{ background: trackColor }}>
              <div className="h-2 rounded-r-full transition-[width] duration-500" style={{ width: `${pct}%`, background: it.color }} />
            </div>
            {it.sub && <div className="tabular mt-1 truncate text-[11px] text-muted">{it.sub}</div>}
          </li>
        )
      })}
    </ol>
  )
}
