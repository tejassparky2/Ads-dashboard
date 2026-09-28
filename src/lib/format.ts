export type MetricFormat = 'currency' | 'int' | 'percent' | 'decimal' | 'multiplier'

const cache = new Map<string, Intl.NumberFormat>()
function nf(key: string, opts: Intl.NumberFormatOptions) {
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(undefined, opts)
    cache.set(key, f)
  }
  return f
}

function currencyFormatter(currency: string, compact: boolean, digits?: number) {
  const key = `c:${currency}:${compact}:${digits}`
  try {
    return nf(key, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: digits ?? (compact ? 1 : 2),
      minimumFractionDigits: compact ? 0 : digits ?? 2,
    })
  } catch {
    // Unknown ISO code – fall back to a plain number with the code as suffix.
    return nf(`c:fallback:${compact}`, { notation: compact ? 'compact' : 'standard', maximumFractionDigits: 2 })
  }
}

export interface FormatOptions {
  currency?: string
  /** 12.9K instead of 12,934 */
  compact?: boolean
}

export function formatValue(value: number | null | undefined, format: MetricFormat, opts: FormatOptions = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const compact = opts.compact ?? false
  switch (format) {
    case 'currency': {
      const currency = opts.currency ?? 'USD'
      // Small unit costs (CPC, CPM) keep 2 decimals even in compact mode.
      const f = currencyFormatter(currency, compact && Math.abs(value) >= 1000)
      return f.format(value)
    }
    case 'int':
      return compact && Math.abs(value) >= 10000
        ? nf('int:c', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
        : nf('int', { maximumFractionDigits: 0 }).format(value)
    case 'percent':
      return nf('pct', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value) + '%'
    case 'decimal':
      return nf('dec', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)
    case 'multiplier':
      return nf('dec', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value) + 'x'
  }
}

/** Short tick labels for chart axes. */
export function formatAxis(value: number, format: MetricFormat, currency?: string): string {
  if (!Number.isFinite(value)) return ''
  if (format === 'percent') return `${+value.toFixed(2)}%`
  if (format === 'multiplier') return `${+value.toFixed(2)}x`
  if (format === 'currency') {
    return Math.abs(value) >= 1000
      ? currencyFormatter(currency ?? 'USD', true).format(value)
      : currencyFormatter(currency ?? 'USD', false, Math.abs(value) < 10 && value % 1 !== 0 ? 2 : 0).format(value)
  }
  return nf('axis', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatDelta(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return '—'
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sign}${Math.abs(pct).toFixed(Math.abs(pct) >= 100 ? 0 : 1)}%`
}
