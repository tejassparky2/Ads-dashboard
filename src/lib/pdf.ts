/**
 * Visual PDF export: snapshots widget cards and lays them out on pages the way
 * they appear on screen. A row of widgets never splits across pages.
 */

export interface PdfMeta {
  title: string
  subtitle: string
  details: { label: string; value: string }[]
}

export interface PdfOptions {
  filename: string
  orientation?: 'landscape' | 'portrait'
  meta: PdfMeta
  onProgress?: (done: number, total: number) => void
}

const MARGIN = 12 // mm
const ROW_GAP = 4 // mm
const FOOTER = 8 // mm reserved at the bottom of every page
/** Never enlarge a narrow (phone) layout beyond this many mm per CSS pixel. */
const MAX_SCALE = 0.3
const MIN_LAYOUT_WIDTH = 1100 // px

const skipIgnored = (el: Node) => !(el instanceof HTMLElement && el.dataset.exportIgnore !== undefined)

/**
 * Used in place of images the snapshot can't read (e.g. ad thumbnails served
 * from Meta's CDN without CORS headers), so one image never fails the export.
 */
export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#e1e0d9"/></svg>')

function buildHeader(meta: PdfMeta, width: number): HTMLElement {
  // The snapshot copies the captured node's own styles, so it must not be the
  // off-screen positioned element itself – it lives inside a hidden host.
  const root = document.createElement('div')
  root.style.cssText = `width:${width}px;padding:4px 2px 18px;background:#fff;color:#0b0b0b;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;`
  const top = document.createElement('div')
  top.style.cssText = 'display:flex;align-items:center;gap:12px;'
  top.innerHTML =
    '<svg viewBox="0 0 32 32" width="36" height="36"><rect width="32" height="32" rx="9" fill="#2a78d6"/><path d="M8 22V15M13.3 22V10M18.7 22v-5M24 22V8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
  const titles = document.createElement('div')
  const h = document.createElement('div')
  h.style.cssText = 'font-size:24px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;'
  h.textContent = meta.title
  const sub = document.createElement('div')
  sub.style.cssText = 'font-size:14px;color:#52514e;margin-top:2px;'
  sub.textContent = meta.subtitle
  titles.append(h, sub)
  top.append(titles)

  const grid = document.createElement('div')
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 32px;margin-top:16px;padding-top:14px;border-top:1px solid #e1e0d9;'
  for (const d of meta.details) {
    const cell = document.createElement('div')
    const l = document.createElement('div')
    l.style.cssText = 'font-size:11px;color:#898781;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;'
    l.textContent = d.label
    const v = document.createElement('div')
    v.style.cssText = 'font-size:14px;margin-top:2px;'
    v.textContent = d.value
    cell.append(l, v)
    grid.append(cell)
  }
  root.append(top, grid)
  return root
}

interface Shot {
  rect: DOMRect
  png: string
}

/** Group snapshots that share a top edge into rows, top to bottom. */
export function groupRows<T extends { rect: Pick<DOMRect, 'top' | 'left'> }>(items: T[]): T[][] {
  const sorted = [...items].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
  const rows: T[][] = []
  for (const s of sorted) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(row[0].rect.top - s.rect.top) < 4) row.push(s)
    else rows.push([s])
  }
  return rows.map((r) => r.sort((a, b) => a.rect.left - b.rect.left))
}

export async function exportPdf(elements: HTMLElement[], opts: PdfOptions): Promise<void> {
  const [{ jsPDF }, { toPng }] = await Promise.all([import('jspdf'), import('html-to-image')])
  const total = elements.length + 1
  opts.onProgress?.(0, total)

  const rects = elements.map((el) => el.getBoundingClientRect())
  const left = Math.min(...rects.map((r) => r.left))
  const gridWidth = Math.max(...rects.map((r) => r.right)) - left
  // Lay out as if at least desktop-wide, so a single narrow widget (or a phone
  // layout) doesn't get an oversized header.
  const layoutWidth = Math.max(gridWidth, MIN_LAYOUT_WIDTH)

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;'
  const header = buildHeader(opts.meta, layoutWidth)
  host.appendChild(header)
  document.body.appendChild(host)
  let headerPng: string
  let headerH: number
  try {
    headerH = header.getBoundingClientRect().height
    headerPng = await toPng(header, { pixelRatio: 2, backgroundColor: '#ffffff' })
  } finally {
    host.remove()
  }
  opts.onProgress?.(1, total)

  const shots: Shot[] = []
  for (const [i, el] of elements.entries()) {
    const png = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff', filter: skipIgnored, imagePlaceholder: IMAGE_PLACEHOLDER })
    shots.push({ rect: rects[i], png })
    opts.onProgress?.(i + 2, total)
  }

  const orientation = opts.orientation ?? 'landscape'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const contentW = pageW - MARGIN * 2
  const bottom = pageH - MARGIN - FOOTER
  const contentH = bottom - MARGIN
  const scale = Math.min(contentW / layoutWidth, MAX_SCALE)
  const x0 = MARGIN + (contentW - gridWidth * scale) / 2

  let y = MARGIN
  pdf.addImage(headerPng, 'PNG', MARGIN + (contentW - layoutWidth * scale) / 2, y, layoutWidth * scale, headerH * scale, undefined, 'FAST')
  y += headerH * scale
  let rowsOnPage = 0

  for (const row of groupRows(shots)) {
    const top = Math.min(...row.map((s) => s.rect.top))
    const heightPx = Math.max(...row.map((s) => s.rect.bottom)) - top
    // A row taller than a page (e.g. a long table) is shrunk to fit one page.
    let s = scale * Math.min(1, contentH / (heightPx * scale))
    const avail = bottom - y
    if (heightPx * s > avail) {
      // Shrink slightly rather than leave a big gap, and never leave the
      // first page with only the header on it.
      const shrink = avail / (heightPx * s)
      if (shrink >= 0.8 || (rowsOnPage === 0 && shrink >= 0.5)) s *= shrink
      else {
        pdf.addPage()
        y = MARGIN
        rowsOnPage = 0
      }
    }
    const h = heightPx * s
    const rowX = x0 + (gridWidth * scale - gridWidth * s) / 2
    for (const shot of row) {
      pdf.addImage(
        shot.png,
        'PNG',
        rowX + (shot.rect.left - left) * s,
        y + (shot.rect.top - top) * s,
        shot.rect.width * s,
        shot.rect.height * s,
        undefined,
        'FAST',
      )
    }
    y += h + ROW_GAP
    rowsOnPage++
  }

  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(137, 135, 129)
    pdf.text('Generated with AdPulse', MARGIN, pageH - MARGIN + 2)
    pdf.text(`Page ${p} of ${pages}`, pageW - MARGIN, pageH - MARGIN + 2, { align: 'right' })
  }

  pdf.save(opts.filename.endsWith('.pdf') ? opts.filename : `${opts.filename}.pdf`)
}
