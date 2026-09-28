import { describe, expect, it } from 'vitest'
import { groupRows } from './pdf'

const item = (id: string, top: number, left: number) => ({ id, rect: { top, left } })

describe('groupRows (PDF layout)', () => {
  it('groups widgets sharing a top edge into left-to-right rows', () => {
    const rows = groupRows([item('c', 300, 0), item('b', 100, 500), item('a', 101, 0), item('d', 300, 700)])
    expect(rows.map((r) => r.map((i) => i.id))).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('puts a lone full-width widget on its own row', () => {
    expect(groupRows([item('a', 0, 0), item('b', 500, 0)])).toHaveLength(2)
  })
})
