import { describe, expect, it } from 'vitest'
import { toCsv } from './export'

describe('toCsv', () => {
  it('quotes and escapes cells', () => {
    expect(toCsv([{ Name: 'Sale, "big"', Spend: 12.5, Note: null }])).toBe('Name,Spend,Note\r\n"Sale, ""big""",12.5,')
  })

  it('neutralises spreadsheet formula injection in text', () => {
    expect(toCsv([{ Name: '=HYPERLINK("x")' }])).toBe(`Name\r\n"'=HYPERLINK(""x"")"`)
    expect(toCsv([{ Value: -5 }])).toBe('Value\r\n-5')
  })
})
