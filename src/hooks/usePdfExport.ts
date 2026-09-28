import { useCallback } from 'react'
import { formatRange } from '../lib/dates'
import { eventLabel } from '../lib/events'
import { safeFilename } from '../lib/export'
import { exportPdf } from '../lib/pdf'
import { useActiveDashboard, useDashboard } from '../store/dashboard'
import { usePdfStatus } from '../store/pdfStatus'
import { useSettings } from '../store/settings'
import { useFilters } from './useData'
import { useResolvedTheme } from './useTheme'

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Returns `exportPdf({ elements?, name?, orientation? })`. With no elements it
 * exports every widget on the active dashboard. The page is switched to light
 * mode and out of edit mode while snapshotting, then restored.
 */
export function usePdfExport() {
  const f = useFilters()
  const dashboard = useActiveDashboard()
  const resolved = useResolvedTheme()
  const setStatus = usePdfStatus((s) => s.set)

  return useCallback(
    async (opts: { elements?: HTMLElement[]; name?: string; orientation?: 'landscape' | 'portrait' } = {}) => {
      if (usePdfStatus.getState().busy) return
      const settings = useSettings.getState()
      const dash = useDashboard.getState()
      const prevTheme = settings.theme
      const wasEditing = dash.editing
      setStatus({ busy: true, done: 0, total: 0, error: null })
      try {
        if (wasEditing) dash.setEditing(false)
        if (resolved === 'dark') settings.set({ theme: 'light' })
        // Let charts re-render in the light palette and settle.
        await nextFrame()
        await nextFrame()
        await wait(resolved === 'dark' || wasEditing ? 400 : 100)

        const elements = opts.elements ?? [...document.querySelectorAll<HTMLElement>('[data-widget]')]
        if (!elements.length) throw new Error('There are no widgets to export.')
        const name = opts.name ?? dashboard.name
        const details = [
          { label: 'Ad account', value: f.account ? `${f.account.name} (${f.account.accountId})` : '—' },
          { label: 'Date range', value: formatRange(f.range) },
          ...(f.compare ? [{ label: 'Compared with', value: formatRange(f.prevRange) }] : []),
          { label: 'Campaigns', value: f.campaignIds.length ? `${f.campaignIds.length} selected` : 'All campaigns' },
          { label: 'Ads', value: f.activeOnly ? 'Active ads only' : 'All ads' },
          { label: 'Conversion event', value: eventLabel(f.ctx.conversionEvent) },
          { label: 'Currency', value: f.currency },
        ]
        await exportPdf(elements, {
          filename: safeFilename(`${name} ${f.account?.name ?? ''} ${f.range.since} to ${f.range.until}`),
          orientation: opts.orientation ?? 'landscape',
          meta: { title: name, subtitle: `Meta Ads performance · ${formatRange(f.range)}`, details },
          onProgress: (done, total) => setStatus({ done, total }),
        })
        setStatus({ busy: false })
      } catch (e) {
        setStatus({ busy: false, error: e instanceof Error ? e.message : 'Could not create the PDF.' })
      } finally {
        if (useSettings.getState().theme !== prevTheme) useSettings.getState().set({ theme: prevTheme })
        if (wasEditing) useDashboard.getState().setEditing(true)
      }
    },
    [f, dashboard.name, resolved, setStatus],
  )
}
