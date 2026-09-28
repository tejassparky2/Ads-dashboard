import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { METRICS, METRIC_GROUPS, metricLabel, type MetricContext } from '../../lib/metrics'

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

const control =
  'w-full h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-[var(--ring)]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ''}`} />
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${control} cursor-pointer appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 ${props.className ?? ''}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23898781' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  )
}

/** Native select of all metrics grouped by category – great on mobile. */
export function MetricSelect({
  value,
  onChange,
  ctx,
  filter,
}: {
  value: string
  onChange: (id: string) => void
  ctx: MetricContext
  filter?: (id: string) => boolean
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {METRIC_GROUPS.map((g) => {
        const items = METRICS.filter((m) => m.group === g && (!filter || filter(m.id)))
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
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface-3 p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-[10px] font-medium transition ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3 text-sm'} ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-fg-2 hover:text-fg'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition ${checked ? 'bg-accent' : 'bg-surface-3 ring-1 ring-line-strong ring-inset'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
    </label>
  )
}
