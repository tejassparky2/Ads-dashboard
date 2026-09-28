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

/** Used for dashboard layout backups. */
export function downloadJson(data: unknown, filename: string) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${safeFilename(filename)}.json`)
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
