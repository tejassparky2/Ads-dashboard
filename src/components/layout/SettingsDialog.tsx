import { Download, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { EVENTS } from '../../lib/events'
import { DEFAULT_API_VERSION } from '../../lib/meta/api'
import { downloadJson } from '../../lib/export'
import { useAuth } from '../../store/auth'
import { useDashboard, type DashboardDef } from '../../store/dashboard'
import { useSettings, type ThemePref } from '../../store/settings'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, Segmented, Select, Switch } from '../ui/Field'

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings()
  const auth = useAuth()
  const dashboards = useDashboard((d) => d.dashboards)
  const importDashboards = useDashboard((d) => d.importDashboards)
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const isCustom = s.conversionEvent.startsWith('custom:')
  const [custom, setCustom] = useState(isCustom ? s.conversionEvent.slice(7) : '')

  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as { dashboards?: DashboardDef[] }
      if (!Array.isArray(data.dashboards) || !data.dashboards.every((d) => d.name && Array.isArray(d.widgets))) throw new Error()
      importDashboards(data.dashboards)
      setMsg(`Imported ${data.dashboards.length} dashboard(s).`)
    } catch {
      setMsg('That file is not a valid layout export.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Settings" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Conversions</h3>
          <Field
            label="Conversion event"
            hint="Drives Conversions, CPA, conversion rate, conversion value, ROAS and AOV across every widget."
          >
            <Select
              value={isCustom ? '__custom' : s.conversionEvent}
              onChange={(e) => {
                if (e.target.value === '__custom') s.set({ conversionEvent: `custom:${custom || 'offsite_conversion.custom'}` })
                else s.set({ conversionEvent: e.target.value })
              }}
            >
              {EVENTS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
              <option value="__custom">Custom action type…</option>
            </Select>
          </Field>
          {isCustom && (
            <Field label="Action type" hint="Exactly as Meta reports it, e.g. offsite_conversion.custom.123456789 or offsite_conversion.fb_pixel_custom.">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onBlur={() => custom && s.set({ conversionEvent: `custom:${custom.trim()}` })}
                placeholder="offsite_conversion.custom.123456789"
              />
            </Field>
          )}
          <Switch label="Compare with previous period" checked={s.compare} onChange={(compare) => s.set({ compare })} />
        </section>

        <section className="space-y-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Appearance</h3>
          <Segmented<ThemePref>
            value={s.theme}
            onChange={(theme) => s.set({ theme })}
            options={[
              { value: 'system', label: <><Monitor className="h-4 w-4" /> System</> },
              { value: 'light', label: <><Sun className="h-4 w-4" /> Light</> },
              { value: 'dark', label: <><Moon className="h-4 w-4" /> Dark</> },
            ]}
          />
        </section>

        <section className="space-y-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Dashboard layouts</h3>
          <p className="text-sm text-fg-2">Layouts are saved in this browser. Export them to back up or move to another device.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => downloadJson({ version: 1, dashboards }, 'adpulse-layout')}>
              <Download className="h-4 w-4" /> Export layout
            </Button>
            <Button size="sm" onClick={() => file.current?.click()}>
              <Upload className="h-4 w-4" /> Import layout
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm('Reset all dashboards to the default layout?')) {
                  localStorage.removeItem('adpulse-dashboards')
                  location.reload()
                }
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset all
            </Button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
          {msg && <p className="text-sm text-fg-2">{msg}</p>}
        </section>

        <section className="space-y-1 border-t border-line pt-5 text-sm">
          <h3 className="mb-2 font-semibold">Connection</h3>
          <p className="text-fg-2">
            {auth.mode === 'demo' ? 'Demo data (no Meta account connected).' : `Connected as ${auth.user?.name} via ${auth.mode === 'facebook' ? 'Facebook Login' : 'access token'}.`}
          </p>
          {auth.mode !== 'demo' && (
            <p className="text-muted">
              Graph API {auth.apiVersion || DEFAULT_API_VERSION} · token stored {auth.remember ? 'in this browser' : 'for this tab only'}
            </p>
          )}
        </section>
      </div>
    </Dialog>
  )
}
