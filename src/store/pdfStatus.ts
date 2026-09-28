import { create } from 'zustand'

interface PdfStatus {
  busy: boolean
  done: number
  total: number
  error: string | null
  set: (p: Partial<Omit<PdfStatus, 'set'>>) => void
}

export const usePdfStatus = create<PdfStatus>()((set) => ({ busy: false, done: 0, total: 0, error: null, set }))
