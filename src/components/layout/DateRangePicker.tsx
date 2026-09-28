import { Calendar, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { PRESETS, formatRange, iso, presetRange } from '../../lib/dates'
import { useFilters } from '../../hooks/useData'
import { useSettings } from '../../store/settings'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'

export function DateRangePicker() {
  const f = useFilters()
  const preset = useSettings((s) => s.preset)
  const set = useSettings((s) => s.set)
  const [since, setSince] = useState(f.range.since)
  const [until, setUntil] = useState(f.range.until)
  const label = preset === 'custom' ? 'Custom' : PRESETS.find((p) => p.id === preset)?.label

  const valid = since && until && since <= until
  return (
    <Popover
      className="w-[300px]"
      trigger={({ toggle }) => (
        <Button
          onClick={() => {
            setSince(f.range.since)
            setUntil(f.range.until)
            toggle()
          }}
          className="max-w-full"
        >
          <Calendar className="h-4 w-4 text-fg-2" />
          <span className="font-semibold">{label}</span>
          <span className="hidden text-fg-2 sm:inline">· {formatRange(f.range)}</span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="px-2.5 pt-1.5 pb-1 text-xs text-muted sm:hidden">{formatRange(f.range)}</div>
          <ul className="grid grid-cols-2 gap-0.5 sm:grid-cols-1">
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    set({ preset: p.id })
                    close()
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3"
                >
                  <span className="w-4">{preset === p.id && <Check className="h-4 w-4 stroke-[2.5] text-accent" />}</span>
                  <span className="flex-1">{p.label}</span>
                  <span className="hidden text-xs text-muted sm:inline">{formatRange(presetRange(p.id)).replace(/, \d{4}/g, '')}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-line p-2.5">
            <div className="mb-2 text-xs font-medium text-fg-2">Custom range</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={since}
                max={until || iso(new Date())}
                onChange={(e) => setSince(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 text-sm"
                aria-label="Start date"
              />
              <span className="text-muted">–</span>
              <input
                type="date"
                value={until}
                min={since}
                max={iso(new Date())}
                onChange={(e) => setUntil(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 text-sm"
                aria-label="End date"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-2.5 w-full justify-center"
              disabled={!valid}
              onClick={() => {
                set({ preset: 'custom', customRange: { since, until } })
                close()
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </Popover>
  )
}
