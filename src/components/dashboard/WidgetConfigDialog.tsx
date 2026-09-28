import { useState } from 'react'
import { getMetric } from '../../lib/metrics'
import { useFilters } from '../../hooks/useData'
import { useDashboard } from '../../store/dashboard'
import { SIZE_LABELS, WIDGET_CATALOG, type Widget, type WidgetSize } from '../../store/widgets'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, MetricSelect, Segmented, Select, Switch } from '../ui/Field'
import { BREAKDOWNS, FUNNEL_STAGES } from '../widgets/options'
import { MetricPicker } from './MetricPicker'
import { widgetTitle } from './widgetMeta'

export function WidgetConfigDialog({ widget, onClose }: { widget: Widget; onClose: () => void }) {
  const f = useFilters()
  const updateWidget = useDashboard((s) => s.updateWidget)
  const [draft, setDraft] = useState<Widget>(() => structuredClone(widget))

  // Typed config updater for the current widget type.
  const cfg = <W extends Widget>(patch: Partial<W['config']>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...patch } }) as Widget)

  const save = () => {
    updateWidget(widget.id, draft)
    onClose()
  }

  const kind = WIDGET_CATALOG.find((c) => c.type === widget.type)!

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${kind.name} settings`}
      description={kind.description}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {draft.type === 'kpi' && (
          <>
            <Field label="Metric">
              <MetricSelect value={draft.config.metric} onChange={(metric) => cfg({ metric })} ctx={f.ctx} />
            </Field>
            <Switch label="Show daily sparkline" checked={draft.config.sparkline} onChange={(sparkline) => cfg({ sparkline })} />
          </>
        )}

        {draft.type === 'trend' && (
          <>
            <Field label="Metrics" hint="Metrics with different units are drawn as stacked panels so each keeps its own scale.">
              <MetricPicker value={draft.config.metrics} onChange={(metrics) => cfg({ metrics })} ctx={f.ctx} max={4} />
            </Field>
            <Field label="Chart type">
              <Segmented
                value={draft.config.chart}
                onChange={(chart) => cfg({ chart })}
                options={[
                  { value: 'area', label: 'Area' },
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Columns' },
                ]}
              />
            </Field>
            <Field label="Group by">
              <Segmented
                value={draft.config.granularity}
                onChange={(granularity) => cfg({ granularity })}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </Field>
            <Switch
              label="Overlay previous period (single metric only)"
              checked={draft.config.comparePrevious}
              onChange={(comparePrevious) => cfg({ comparePrevious })}
            />
          </>
        )}

        {draft.type === 'bar' && (
          <>
            <Field label="Rank">
              <Segmented
                value={draft.config.level}
                onChange={(level) => cfg({ level })}
                options={[
                  { value: 'campaign', label: 'Campaigns' },
                  { value: 'adset', label: 'Ad sets' },
                  { value: 'ad', label: 'Ads' },
                ]}
              />
            </Field>
            <Field label="By metric">
              <MetricSelect value={draft.config.metric} onChange={(metric) => cfg({ metric, order: getMetric(metric).good === 'down' ? 'asc' : 'desc' })} ctx={f.ctx} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Order">
                <Select value={draft.config.order} onChange={(e) => cfg({ order: e.target.value as 'asc' | 'desc' })}>
                  <option value="desc">Highest first</option>
                  <option value="asc">Lowest first</option>
                </Select>
              </Field>
              <Field label="Show">
                <Select value={draft.config.limit} onChange={(e) => cfg({ limit: Number(e.target.value) })}>
                  {[5, 8, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      Top {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        {draft.type === 'breakdown' && (
          <>
            <Field label="Break down by">
              <Select value={draft.config.dimension} onChange={(e) => cfg({ dimension: e.target.value as typeof draft.config.dimension })}>
                {BREAKDOWNS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Metric">
              <MetricSelect value={draft.config.metric} onChange={(metric) => cfg({ metric })} ctx={f.ctx} />
            </Field>
            <Field label="Display" hint={!getMetric(draft.config.metric).additive ? 'Share-of-total (donut) needs a summable metric like spend or conversions.' : undefined}>
              <Segmented
                value={getMetric(draft.config.metric).additive ? draft.config.display : 'bar'}
                onChange={(display) => cfg({ display })}
                options={[
                  { value: 'bar', label: 'Bars' },
                  ...(getMetric(draft.config.metric).additive ? [{ value: 'donut' as const, label: 'Donut' }] : []),
                ]}
              />
            </Field>
          </>
        )}

        {draft.type === 'funnel' && (
          <Field label="Stages (top to bottom)">
            <MetricPicker
              value={draft.config.stages}
              onChange={(stages) => cfg({ stages })}
              ctx={f.ctx}
              max={7}
              filter={(id) => FUNNEL_STAGES.includes(id)}
              addLabel="Add stage…"
            />
          </Field>
        )}

        {draft.type === 'table' && (
          <>
            <Field label="Rows">
              <Segmented
                value={draft.config.level}
                onChange={(level) => cfg({ level })}
                options={[
                  { value: 'campaign', label: 'Campaigns' },
                  { value: 'adset', label: 'Ad sets' },
                  { value: 'ad', label: 'Ads' },
                ]}
              />
            </Field>
            <Field label="Columns">
              <MetricPicker value={draft.config.columns} onChange={(columns) => cfg({ columns })} ctx={f.ctx} addLabel="Add column…" />
            </Field>
            <Switch label="Show delivery status" checked={draft.config.showStatus} onChange={(showStatus) => cfg({ showStatus })} />
            <Field label="Rows per page">
              <Select value={draft.config.pageSize} onChange={(e) => cfg({ pageSize: Number(e.target.value) })}>
                {[10, 15, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label="Title" hint="Leave empty for an automatic title.">
            <Input value={draft.title ?? ''} placeholder={widgetTitle({ ...draft, title: undefined }, f.ctx)} onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })} />
          </Field>
          <Field label="Width" hint="On phones, wide widgets use the full screen.">
            <Select value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value as WidgetSize })}>
              {(Object.keys(SIZE_LABELS) as WidgetSize[]).map((s) => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
