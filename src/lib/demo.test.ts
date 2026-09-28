import { describe, expect, it } from 'vitest'
import { demoApi } from './demo'
import { sumBase } from './metrics'

const range = { since: '2026-08-01', until: '2026-08-31' }

describe('demo data', () => {
  it('is deterministic and consistent across levels', async () => {
    const [total] = await demoApi.insights({ accountId: 'act_1', level: 'account', range })
    const campaigns = await demoApi.insights({ accountId: 'act_1', level: 'campaign', range })
    const daily = await demoApi.insights({ accountId: 'act_1', level: 'account', range, daily: true })
    expect(total.spend).toBeGreaterThan(0)
    expect(sumBase(campaigns).spend).toBeCloseTo(total.spend, 0)
    expect(sumBase(daily).impressions).toBe(total.impressions)
    expect(daily).toHaveLength(31)
    const [again] = await demoApi.insights({ accountId: 'act_1', level: 'account', range })
    expect(again.spend).toBe(total.spend)
  })

  it('drops paused ads when only active ads are requested', async () => {
    const recent = { since: '2026-09-01', until: '2026-09-27' }
    const all = await demoApi.insights({ accountId: 'act_1', level: 'ad', range: recent })
    const active = await demoApi.insights({ accountId: 'act_1', level: 'ad', range: recent, activeOnly: true })
    const status = Object.fromEntries((await demoApi.entities('ad')).map((e) => [e.id, e.status]))
    expect(active.length).toBeGreaterThan(0)
    expect(active.length).toBeLessThan(all.length)
    expect(active.every((r) => status[r.key] === 'ACTIVE')).toBe(true)
  })

  it('respects the campaign filter', async () => {
    const all = await demoApi.insights({ accountId: 'act_1', level: 'campaign', range })
    const one = await demoApi.insights({ accountId: 'act_1', level: 'campaign', range, campaignIds: [all[0].key] })
    expect(one).toHaveLength(1)
    expect(one[0].key).toBe(all[0].key)
  })
})
