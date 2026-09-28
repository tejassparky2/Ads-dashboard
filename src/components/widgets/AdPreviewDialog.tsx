import { ImageOff, Play } from 'lucide-react'
import { useState } from 'react'
import { formatValue } from '../../lib/format'
import { computeMetric, getMetric, metricLabel, type MetricContext } from '../../lib/metrics'
import type { CreativePreview, InsightRow } from '../../lib/types'
import { Dialog } from '../ui/Dialog'

const TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  PHOTO: 'Image',
  SHARE: 'Link ad',
  STATUS: 'Text',
  APPLICATION: 'App ad',
  OFFER: 'Offer',
}

const statusLabel = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())

/** Larger look at an ad's creative plus its numbers for the selected period. */
export function AdPreviewDialog({
  row,
  creative,
  status,
  metrics,
  ctx,
  currency,
  onClose,
}: {
  row: InsightRow
  creative?: CreativePreview
  status?: string
  metrics: string[]
  ctx: MetricContext
  currency: string
  onClose: () => void
}) {
  const [failed, setFailed] = useState(false)
  // Prefer the full-size image; video creatives only have a thumbnail.
  const src = creative?.imageUrl || creative?.thumbnailUrl
  const type = creative?.type ? (TYPE_LABEL[creative.type] ?? statusLabel(creative.type)) : undefined

  return (
    <Dialog open onClose={onClose} title={row.name} description={[row.campaignName, row.adsetName].filter(Boolean).join(' · ')} size="md">
      <div className="space-y-5">
        <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl bg-surface-3">
          {src && !failed ? (
            <img src={src} alt={`Creative for ${row.name}`} onError={() => setFailed(true)} className="max-h-[50dvh] w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-sm text-muted">
              <ImageOff className="h-6 w-6" aria-hidden />
              No preview available
            </div>
          )}
          {creative?.type === 'VIDEO' && src && !failed && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              <Play className="h-3 w-3 fill-current" aria-hidden /> Video · thumbnail
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {status && <span className="rounded-md bg-surface-3 px-2 py-1 font-medium text-fg-2">{statusLabel(status)}</span>}
          {type && <span className="rounded-md bg-surface-3 px-2 py-1 font-medium text-fg-2">{type}</span>}
          <span className="rounded-md bg-surface-3 px-2 py-1 text-muted">Ad ID {row.key}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {metrics.map((id) => (
            <div key={id} className="rounded-xl border border-line px-3 py-2.5">
              <dt className="truncate text-xs text-muted">{metricLabel(id, ctx)}</dt>
              <dd className="mt-0.5 text-base font-semibold">{formatValue(computeMetric(id, row, ctx), getMetric(id).format, { currency })}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Dialog>
  )
}
