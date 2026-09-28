import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../../hooks/useTheme'

interface PopoverProps {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
}

/**
 * Anchored dropdown that closes on outside click and Escape. On phones it
 * becomes a bottom sheet (portaled, so scrolling toolbars can't clip it).
 */
export function Popover({ trigger, children, align = 'start', className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const phone = useMediaQuery('(max-width: 639px)')

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !panel.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        phone &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" />
            <div
              ref={panel}
              className="animate-sheet relative max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-pop"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
              {children(() => setOpen(false))}
            </div>
          </div>,
          document.body,
        )}
      {open && !phone && (
        <div
          ref={panel}
          className={`animate-pop absolute top-full z-40 mt-1.5 max-w-[calc(100vw-24px)] rounded-xl border border-line bg-surface p-1 shadow-pop ${align === 'end' ? 'right-0' : 'left-0'} ${className}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  hint,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  danger?: boolean
  hint?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3 ${danger ? 'text-bad' : 'text-fg'}`}
    >
      {icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center text-fg-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  )
}

export const MenuSeparator = () => <div className="my-1 h-px bg-line" />

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{children}</div>
)
