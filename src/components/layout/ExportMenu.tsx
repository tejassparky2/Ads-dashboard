import { FileDown, Loader2, Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useFilters } from '../../hooks/useData'
import { usePdfExport } from '../../hooks/usePdfExport'
import { usePdfStatus } from '../../store/pdfStatus'
import { Button } from '../ui/Button'
import { MenuItem, MenuLabel, MenuSeparator, Popover } from '../ui/Popover'

export function ExportMenu() {
  const f = useFilters()
  const exportPdf = usePdfExport()
  const busy = usePdfStatus((s) => s.busy)

  return (
    <Popover
      align="end"
      className="w-64"
      trigger={({ toggle }) => (
        <Button onClick={toggle} disabled={!f.accountId || busy} aria-label="Download PDF">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          <span className="hidden md:inline">PDF</span>
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Download PDF report</MenuLabel>
          <MenuItem icon={<RectangleHorizontal />} onClick={() => (close(), exportPdf({ orientation: 'landscape' }))} hint="A4">
            Landscape
          </MenuItem>
          <MenuItem icon={<RectangleVertical />} onClick={() => (close(), exportPdf({ orientation: 'portrait' }))} hint="A4">
            Portrait
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Printer />} onClick={() => (close(), setTimeout(() => window.print(), 50))}>
            Print
          </MenuItem>
        </>
      )}
    </Popover>
  )
}
