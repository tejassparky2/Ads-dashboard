import type { ChartTheme } from '../../lib/palette'
import type { BreakdownConfig } from '../../store/widgets'

export const BREAKDOWNS: { id: BreakdownConfig['dimension']; label: string }[] = [
  { id: 'age', label: 'Age' },
  { id: 'gender', label: 'Gender' },
  { id: 'publisher_platform', label: 'Platform' },
  { id: 'platform_position', label: 'Placement' },
  { id: 'device_platform', label: 'Device type' },
  { id: 'impression_device', label: 'Device' },
  { id: 'country', label: 'Country' },
  { id: 'region', label: 'Region' },
]

/** Count metrics that make sense as funnel stages. */
export const FUNNEL_STAGES = ['impressions', 'clicks', 'link_clicks', 'lpv', 'add_to_cart', 'checkouts', 'conversions', 'purchases', 'leads']

/** Recessive axis styling shared by every cartesian chart. */
export const axisProps = (t: ChartTheme) => ({
  stroke: t.axis,
  tick: { fill: t.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
})
