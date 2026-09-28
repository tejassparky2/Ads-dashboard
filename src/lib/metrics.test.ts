import { describe, expect, it } from 'vitest'
import { withCanonicalEvents } from './events'
import { computeMetric, deltaTone, pctChange, sumBase } from './metrics'
import type { BaseMetrics } from './types'

const base = (p: Partial<BaseMetrics> = {}): BaseMetrics => ({
  spend: 500,
  impressions: 100000,
  reach: 40000,
  clicks: 2000,
  linkClicks: 1500,
  actions: withCanonicalEvents({ omni_purchase: 25, purchase: 25, 'offsite_conversion.fb_pixel_purchase': 24, lead: 10, landing_page_view: 1200 }),
  actionValues: withCanonicalEvents({ omni_purchase: 2000, purchase: 2000 }),
  ...p,
})
const ctx = { conversionEvent: 'purchase' }

describe('computeMetric', () => {
  it('derives cost and rate metrics', () => {
    const b = base()
    expect(computeMetric('cpc', b, ctx)).toBe(0.25)
    expect(computeMetric('cplc', b, ctx)).toBeCloseTo(0.3333, 4)
    expect(computeMetric('cpm', b, ctx)).toBe(5)
    expect(computeMetric('ctr', b, ctx)).toBe(2)
    expect(computeMetric('link_ctr', b, ctx)).toBe(1.5)
    expect(computeMetric('frequency', b, ctx)).toBe(2.5)
  })

  it('does not double count overlapping purchase action types', () => {
    const b = base()
    expect(computeMetric('conversions', b, ctx)).toBe(25)
    expect(computeMetric('cpa', b, ctx)).toBe(20)
    expect(computeMetric('revenue', b, ctx)).toBe(2000)
    expect(computeMetric('roas', b, ctx)).toBe(4)
    expect(computeMetric('aov', b, ctx)).toBe(80)
  })

  it('follows the selected conversion event, including custom action types', () => {
    expect(computeMetric('conversions', base(), { conversionEvent: 'lead' })).toBe(10)
    expect(computeMetric('cpa', base(), { conversionEvent: 'lead' })).toBe(50)
    expect(computeMetric('conversions', base(), { conversionEvent: 'custom:offsite_conversion.fb_pixel_purchase' })).toBe(24)
  })

  it('returns null instead of dividing by zero', () => {
    const b = base({ clicks: 0, impressions: 0, actions: {} })
    expect(computeMetric('cpc', b, ctx)).toBeNull()
    expect(computeMetric('ctr', b, ctx)).toBeNull()
    expect(computeMetric('cpa', b, ctx)).toBeNull()
    expect(computeMetric('conversions', b, ctx)).toBe(0)
  })
})

describe('sumBase', () => {
  it('sums additive fields and action maps', () => {
    const s = sumBase([base(), base({ spend: 100 })])
    expect(s.spend).toBe(600)
    expect(s.actions['ev:purchase']).toBe(50)
    expect(computeMetric('cpa', s, ctx)).toBe(12)
  })
})

describe('deltas', () => {
  it('computes percent change', () => {
    expect(pctChange(120, 100)).toBe(20)
    expect(pctChange(80, 100)).toBe(-20)
    expect(pctChange(5, 0)).toBeNull()
  })

  it('colours by whether up is good for the metric', () => {
    expect(deltaTone('roas', 10)).toBe('good')
    expect(deltaTone('cpa', 10)).toBe('bad')
    expect(deltaTone('cpa', -10)).toBe('good')
    expect(deltaTone('spend', 10)).toBe('neutral')
    expect(deltaTone('roas', null)).toBe('neutral')
  })
})
