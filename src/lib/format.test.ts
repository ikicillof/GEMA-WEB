import { describe, it, expect } from 'vitest'
import { formatCurrencyARS } from './format'

describe('formatCurrencyARS', () => {
  it('formats a whole ARS amount with thousands separators', () => {
    const result = formatCurrencyARS(15000)
    expect(result).toContain('15.000')
    expect(result).toMatch(/\$/)
  })

  it('rounds to whole pesos (no decimals shown)', () => {
    const result = formatCurrencyARS(8990.5)
    expect(result).not.toMatch(/[.,]\d{2}$/)
  })

  it('formats zero correctly', () => {
    expect(formatCurrencyARS(0)).toContain('0')
  })

  it('throws for NaN', () => {
    expect(() => formatCurrencyARS(NaN)).toThrow()
  })

  it('throws for Infinity', () => {
    expect(() => formatCurrencyARS(Infinity)).toThrow()
  })
})
