import { createContext, useContext, useEffect } from 'react'
import type { Table } from '../../lib/export'

export const WidgetDataContext = createContext<(t: Table) => void>(() => {})

/**
 * Widgets publish the rows behind what they draw. The frame uses them for
 * CSV/Excel download and the accessible "view as table" mode.
 * Pass a memoized table.
 */
export function useWidgetData(table: Table) {
  const set = useContext(WidgetDataContext)
  useEffect(() => set(table), [set, table])
}
