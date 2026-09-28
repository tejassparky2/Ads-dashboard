export type Cell = string | number | null
export type Table = Record<string, Cell>[]

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilename(s: string) {
  return s.replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 80) || 'export'
}

function csvCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Guard against formula injection when the file is opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === 'string' ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: Table): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvCell).join(',')]
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(','))
  return lines.join('\r\n')
}

export function downloadCsv(rows: Table, filename: string) {
  // BOM so Excel opens UTF-8 (currency symbols, emoji in ad names) correctly.
  download(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `${safeFilename(filename)}.csv`)
}

export function downloadJson(data: unknown, filename: string) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${safeFilename(filename)}.json`)
}

/** Multi-sheet Excel workbook. SheetJS is loaded on demand to keep the main bundle small. */
export async function downloadXlsx(sheets: { name: string; rows: Table }[], filename: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': 'No data' }])
    const headers = Object.keys(s.rows[0] ?? {})
    ws['!cols'] = headers.map((h) => ({
      wch: Math.min(48, Math.max(h.length, ...s.rows.slice(0, 200).map((r) => String(r[h] ?? '').length)) + 2),
    }))
    XLSX.utils.book_append_sheet(wb, ws, s.name.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet')
  }
  XLSX.writeFile(wb, `${safeFilename(filename)}.xlsx`, { compression: true })
}

export async function downloadPng(node: HTMLElement, filename: string, background: string) {
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: background,
    filter: (el) => !(el instanceof HTMLElement && el.dataset.exportIgnore !== undefined),
  })
  const blob = await (await fetch(dataUrl)).blob()
  download(blob, `${safeFilename(filename)}.png`)
}
