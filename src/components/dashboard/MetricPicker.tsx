import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { METRICS, METRIC_GROUPS, metricLabel, type MetricContext } from '../../lib/metrics'
import { Select } from '../ui/Field'

/** Ordered multi-select: chips you can reorder or remove, plus an "add" select. */
export function MetricPicker({
  value,
  onChange,
  ctx,
  max,
  filter,
  addLabel = 'Add metric…',
}: {
  value: string[]
  onChange: (v: string[]) => void
  ctx: MetricContext
  max?: number
  filter?: (id: string) => boolean
  addLabel?: string
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...value]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  const full = max !== undefined && value.length >= max
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {value.map((id, i) => (
          <li key={id} className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 py-1 pr-1 pl-3 text-sm">
            <span className="flex-1 truncate">{metricLabel(id, ctx)}</span>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={value.length <= 1} onClick={() => onChange(value.filter((v) => v !== id))} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-bad-soft hover:text-bad disabled:opacity-30" aria-label="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {!full && (
        <Select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
          <option value="">{addLabel}</option>
          {METRIC_GROUPS.map((g) => {
            const items = METRICS.filter((m) => m.group === g && !value.includes(m.id) && (!filter || filter(m.id)))
            if (!items.length) return null
            return (
              <optgroup key={g} label={g}>
                {items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {metricLabel(m.id, ctx)}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </Select>
      )}
      {max !== undefined && <p className="text-xs text-muted">Up to {max}.</p>}
    </div>
  )
}
