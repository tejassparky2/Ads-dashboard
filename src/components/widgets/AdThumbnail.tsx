import { ImageOff, Play } from 'lucide-react'
import { useState } from 'react'
import type { CreativePreview } from '../../lib/types'

const SIZES = {
  sm: 'h-10 w-10 rounded-lg',
  lg: 'h-16 w-16 rounded-xl',
}

/** Square creative preview. Falls back to an icon when there's no image or it fails to load. */
export function AdThumbnail({
  creative,
  name,
  size = 'sm',
  onClick,
}: {
  creative?: CreativePreview
  name: string
  size?: keyof typeof SIZES
  onClick?: () => void
}) {
  const [failed, setFailed] = useState(false)
  const src = creative?.thumbnailUrl || creative?.imageUrl
  const video = creative?.type === 'VIDEO'
  const body =
    src && !failed ? (
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    ) : (
      <ImageOff className="h-4 w-4 text-muted" aria-hidden />
    )

  const cls = `relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-3 ring-1 ring-line ring-inset ${SIZES[size]}`
  const badge = video && src && !failed && (
    <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white" aria-hidden>
      <Play className="h-2.5 w-2.5 fill-current" />
    </span>
  )

  if (!onClick) {
    return (
      <span className={cls}>
        {body}
        {badge}
      </span>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={`Preview creative for ${name}`} className={`${cls} cursor-zoom-in transition hover:ring-2 hover:ring-accent`}>
      {body}
      {badge}
    </button>
  )
}
