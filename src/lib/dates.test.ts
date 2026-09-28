import { describe, expect, it } from 'vitest'
import { bucketDate, eachDay, presetRange, previousRange, rangeDays } from './dates'

const today = new Date(2026, 8, 28) // Sep 28 2026

describe('dates', () => {
  it('resolves presets excluding today for "last N days"', () => {
    expect(presetRange('last_7d', today)).toEqual({ since: '2026-09-21', until: '2026-09-27' })
    expect(presetRange('yesterday', today)).toEqual({ since: '2026-09-27', until: '2026-09-27' })
    expect(presetRange('last_month', today)).toEqual({ since: '2026-08-01', until: '2026-08-31' })
    expect(presetRange('this_month', today)).toEqual({ since: '2026-09-01', until: '2026-09-28' })
  })

  it('computes the previous period of equal length', () => {
    const r = { since: '2026-09-21', until: '2026-09-27' }
    expect(rangeDays(r)).toBe(7)
    expect(previousRange(r)).toEqual({ since: '2026-09-14', until: '2026-09-20' })
  })

  it('lists and buckets days', () => {
    expect(eachDay({ since: '2026-02-27', until: '2026-03-02' })).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
    expect(bucketDate('2026-09-27', 'week')).toBe('2026-09-21')
    expect(bucketDate('2026-09-27', 'month')).toBe('2026-09-01')
  })
})
