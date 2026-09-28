import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { creativeWidgets, overviewWidgets, uid, type Widget } from './widgets'

export interface DashboardDef {
  id: string
  name: string
  widgets: Widget[]
}

export type DashboardTemplate = 'overview' | 'creative' | 'blank'

interface DashboardState {
  dashboards: DashboardDef[]
  activeId: string
  editing: boolean
  setEditing: (v: boolean) => void
  setActive: (id: string) => void
  addDashboard: (name: string, template: DashboardTemplate) => void
  renameDashboard: (id: string, name: string) => void
  removeDashboard: (id: string) => void
  resetDashboard: (id: string) => void
  addWidget: (w: Widget) => void
  updateWidget: (id: string, patch: Partial<Widget>) => void
  removeWidget: (id: string) => void
  duplicateWidget: (id: string) => void
  moveWidget: (fromId: string, toId: string) => void
  shiftWidget: (id: string, dir: -1 | 1) => void
  importDashboards: (defs: DashboardDef[]) => void
}

const fromTemplate = (t: DashboardTemplate): Widget[] =>
  t === 'overview' ? overviewWidgets() : t === 'creative' ? creativeWidgets() : []

function initial(): Pick<DashboardState, 'dashboards' | 'activeId'> {
  const overview = { id: 'overview', name: 'Overview', widgets: overviewWidgets() }
  const creative = { id: 'creative', name: 'Creative & reach', widgets: creativeWidgets() }
  return { dashboards: [overview, creative], activeId: overview.id }
}

export const useDashboard = create<DashboardState>()(
  persist(
    (set) => {
      /** Apply `fn` to the active dashboard's widget list. */
      const edit = (fn: (ws: Widget[]) => Widget[]) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => (d.id === s.activeId ? { ...d, widgets: fn(d.widgets) } : d)),
        }))

      return {
        ...initial(),
        editing: false,
        setEditing: (editing) => set({ editing }),
        setActive: (activeId) => set({ activeId }),
        addDashboard: (name, template) => {
          const d: DashboardDef = { id: uid(), name, widgets: fromTemplate(template) }
          set((s) => ({ dashboards: [...s.dashboards, d], activeId: d.id, editing: template === 'blank' }))
        },
        renameDashboard: (id, name) =>
          set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, name } : d)) })),
        removeDashboard: (id) =>
          set((s) => {
            const dashboards = s.dashboards.filter((d) => d.id !== id)
            if (!dashboards.length) return initial()
            return { dashboards, activeId: s.activeId === id ? dashboards[0].id : s.activeId }
          }),
        resetDashboard: (id) =>
          set((s) => ({
            dashboards: s.dashboards.map((d) =>
              d.id === id ? { ...d, widgets: id === 'creative' ? creativeWidgets() : overviewWidgets() } : d,
            ),
          })),
        addWidget: (w) => edit((ws) => [...ws, w]),
        updateWidget: (id, patch) => edit((ws) => ws.map((w) => (w.id === id ? ({ ...w, ...patch } as Widget) : w))),
        removeWidget: (id) => edit((ws) => ws.filter((w) => w.id !== id)),
        duplicateWidget: (id) =>
          edit((ws) => {
            const i = ws.findIndex((w) => w.id === id)
            if (i < 0) return ws
            const copy = { ...structuredClone(ws[i]), id: uid() }
            return [...ws.slice(0, i + 1), copy, ...ws.slice(i + 1)]
          }),
        moveWidget: (fromId, toId) =>
          edit((ws) => {
            const from = ws.findIndex((w) => w.id === fromId)
            const to = ws.findIndex((w) => w.id === toId)
            if (from < 0 || to < 0 || from === to) return ws
            const next = [...ws]
            const [item] = next.splice(from, 1)
            next.splice(to, 0, item)
            return next
          }),
        shiftWidget: (id, dir) =>
          edit((ws) => {
            const i = ws.findIndex((w) => w.id === id)
            const j = i + dir
            if (i < 0 || j < 0 || j >= ws.length) return ws
            const next = [...ws]
            ;[next[i], next[j]] = [next[j], next[i]]
            return next
          }),
        importDashboards: (defs) =>
          set(() => {
            const dashboards = defs.map((d) => ({ ...d, id: d.id || uid() }))
            return { dashboards, activeId: dashboards[0].id }
          }),
      }
    },
    {
      name: 'adpulse-dashboards',
      version: 1,
      partialize: (s) => ({ dashboards: s.dashboards, activeId: s.activeId }),
    },
  ),
)

export function useActiveDashboard(): DashboardDef {
  return useDashboard((s) => s.dashboards.find((d) => d.id === s.activeId) ?? s.dashboards[0])
}
