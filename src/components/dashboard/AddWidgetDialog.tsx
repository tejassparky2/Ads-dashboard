import { BarChart3, Filter, Gauge, LineChart, PieChart, Table2 } from 'lucide-react'
import { WIDGET_CATALOG, type WidgetType } from '../../store/widgets'
import { Dialog } from '../ui/Dialog'

const ICONS: Record<WidgetType, typeof Gauge> = {
  kpi: Gauge,
  trend: LineChart,
  bar: BarChart3,
  breakdown: PieChart,
  funnel: Filter,
  table: Table2,
}

export function AddWidgetDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: WidgetType) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a widget" description="Pick a widget, then choose its metrics. You can drag it anywhere afterwards." size="lg">
      <div className="grid gap-3 sm:grid-cols-2">
        {WIDGET_CATALOG.map((w) => {
          const Icon = ICONS[w.type]
          return (
            <button
              key={w.type}
              type="button"
              onClick={() => onPick(w.type)}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left transition hover:border-accent hover:bg-accent-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{w.name}</span>
                <span className="mt-0.5 block text-[13px] text-fg-2">{w.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
