import { AlertTriangle, FileDown, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { usePdfStatus } from '../../store/pdfStatus'

/** Blocking overlay while a PDF is generated, plus an error toast. */
export function PdfProgress() {
  const { busy, done, total, error, set } = usePdfStatus()
  if (busy) {
    const pct = total ? Math.round((done / total) * 100) : 0
    return createPortal(
      <div className="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px]" role="status" aria-live="polite">
        <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center shadow-pop">
          <FileDown className="mx-auto h-7 w-7 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-semibold">Creating your PDF…</p>
          <p className="mt-0.5 text-xs text-muted">{total ? `Rendering ${Math.min(done, total)} of ${total}` : 'Preparing charts'}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>,
      document.body,
    )
  }
  if (error) {
    return createPortal(
      <div className="print-hide fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm shadow-pop" role="alert">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
        <span className="flex-1">{error}</span>
        <button type="button" onClick={() => set({ error: null })} aria-label="Dismiss" className="cursor-pointer text-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>,
      document.body,
    )
  }
  return null
}
