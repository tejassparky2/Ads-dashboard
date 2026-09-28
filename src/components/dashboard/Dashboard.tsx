import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutGrid, Plus } from 'lucide-react'
import { useState } from 'react'
import { useActiveDashboard, useDashboard } from '../../store/dashboard'
import { defaultWidget, type Widget, type WidgetType } from '../../store/widgets'
import { Button } from '../ui/Button'
import { BarWidget } from '../widgets/BarWidget'
import { BreakdownWidget } from '../widgets/BreakdownWidget'
import { FunnelWidget } from '../widgets/FunnelWidget'
import { KpiWidget } from '../widgets/KpiWidget'
import { TableWidget } from '../widgets/TableWidget'
import { TrendWidget } from '../widgets/TrendWidget'
import { AddWidgetDialog } from './AddWidgetDialog'
import { WidgetConfigDialog } from './WidgetConfigDialog'
import { WidgetFrame } from './WidgetFrame'
import { SPAN } from './widgetMeta'

function WidgetBody({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'kpi':
      return <KpiWidget config={widget.config} />
    case 'trend':
      return <TrendWidget config={widget.config} />
    case 'bar':
      return <BarWidget config={widget.config} />
    case 'breakdown':
      return <BreakdownWidget config={widget.config} />
    case 'funnel':
      return <FunnelWidget config={widget.config} />
    case 'table':
      return <TableWidget config={widget.config} />
  }
}

function SortableWidget(props: { widget: Widget; index: number; total: number; editing: boolean; onConfigure: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.widget.id, disabled: !props.editing })
  return (
    <div
      ref={setNodeRef}
      id={`w-${props.widget.id}`}
      className={`${SPAN[props.widget.size]} ${isDragging ? 'relative z-30 opacity-80' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <WidgetFrame {...props} handleProps={{ ...attributes, ...listeners }}>
        <WidgetBody widget={props.widget} />
      </WidgetFrame>
    </div>
  )
}

export function Dashboard({ addOpen, setAddOpen }: { addOpen: boolean; setAddOpen: (v: boolean) => void }) {
  const dashboard = useActiveDashboard()
  const editing = useDashboard((s) => s.editing)
  const moveWidget = useDashboard((s) => s.moveWidget)
  const addWidget = useDashboard((s) => s.addWidget)
  const [configuring, setConfiguring] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) moveWidget(String(e.active.id), String(e.over.id))
  }

  const pick = (type: WidgetType) => {
    const w = defaultWidget(type)
    addWidget(w)
    setAddOpen(false)
    setConfiguring(w.id)
    requestAnimationFrame(() => document.getElementById(`w-${w.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const configuringWidget = dashboard.widgets.find((w) => w.id === configuring)

  return (
    <>
      {dashboard.widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <LayoutGrid className="h-6 w-6" />
          </span>
          <h2 className="text-base font-semibold">This dashboard is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-fg-2">Add KPI cards, charts, breakdowns and tables — then drag them into the order you like.</p>
          <Button variant="primary" className="mt-5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add widget
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={dashboard.widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              {dashboard.widgets.map((w, i) => (
                <SortableWidget key={w.id} widget={w} index={i} total={dashboard.widgets.length} editing={editing} onConfigure={() => setConfiguring(w.id)} />
              ))}
              {editing && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="col-span-12 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong text-sm font-medium text-fg-2 transition hover:border-accent hover:text-accent lg:col-span-3"
                >
                  <Plus className="h-5 w-5" />
                  Add widget
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <AddWidgetDialog open={addOpen} onClose={() => setAddOpen(false)} onPick={pick} />
      {configuringWidget && <WidgetConfigDialog key={configuringWidget.id} widget={configuringWidget} onClose={() => setConfiguring(null)} />}
    </>
  )
}
