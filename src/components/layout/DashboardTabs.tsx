import { Check, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDashboard, type DashboardTemplate } from '../../store/dashboard'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, Segmented } from '../ui/Field'
import { MenuItem, Popover } from '../ui/Popover'

export function DashboardTabs() {
  const { dashboards, activeId, setActive, addDashboard, renameDashboard, removeDashboard, resetDashboard } = useDashboard()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<DashboardTemplate>('blank')

  return (
    <>
      <div className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
        {dashboards.map((d) => {
          const active = d.id === activeId
          return (
            <div key={d.id} className={`group flex shrink-0 items-center rounded-xl ${active ? 'bg-surface shadow-card ring-1 ring-line' : ''}`}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActive(d.id)}
                className={`h-9 cursor-pointer rounded-xl px-3.5 text-sm font-medium whitespace-nowrap ${active ? 'text-fg' : 'text-fg-2 hover:text-fg'}`}
              >
                {d.name}
              </button>
              {active && (
                <Popover
                  className="w-52"
                  trigger={({ toggle }) => (
                    <button type="button" onClick={toggle} aria-label="Dashboard options" className="mr-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuItem
                        icon={<Pencil />}
                        onClick={() => {
                          close()
                          setName(d.name)
                          setRenaming(d.id)
                        }}
                      >
                        Rename
                      </MenuItem>
                      <MenuItem
                        icon={<RotateCcw />}
                        onClick={() => {
                          close()
                          if (confirm(`Reset "${d.name}" to its default widgets?`)) resetDashboard(d.id)
                        }}
                      >
                        Reset to default
                      </MenuItem>
                      <MenuItem
                        icon={<Trash2 />}
                        danger
                        onClick={() => {
                          close()
                          if (confirm(`Delete dashboard "${d.name}"?`)) removeDashboard(d.id)
                        }}
                      >
                        Delete
                      </MenuItem>
                    </>
                  )}
                </Popover>
              )}
            </div>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setName('')
            setTemplate('blank')
            setCreating(true)
          }}
          aria-label="New dashboard"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New dashboard"
        size="sm"
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                addDashboard(name.trim() || 'Untitled', template)
                setCreating(false)
              }}
            >
              <Check className="h-4 w-4" /> Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Client report, Retargeting" />
          </Field>
          <Field label="Start from">
            <Segmented
              value={template}
              onChange={setTemplate}
              options={[
                { value: 'blank', label: 'Blank' },
                { value: 'overview', label: 'Overview' },
                { value: 'creative', label: 'Creative' },
              ]}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename dashboard"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming && name.trim()) renameDashboard(renaming, name.trim())
                setRenaming(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </Dialog>
    </>
  )
}
