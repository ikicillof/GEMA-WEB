import { describe, it, expect } from 'vitest'
import { computeTransferPrice } from './pricing'

describe('computeTransferPrice', () => {
  it('applies a 10% discount', () => {
    expect(computeTransferPrice(10000)).toBe(9000)
  })

  it('rounds to the nearest whole peso', () => {
    expect(computeTransferPrice(9999)).toBe(8999)
  })

  it('returns 0 for a price of 0', () => {
    expect(computeTransferPrice(0)).toBe(0)
  })

  it('throws for a negative price', () => {
    expect(() => computeTransferPrice(-100)).toThrow()
  })

  it('throws for a non-finite price', () => {
    expect(() => computeTransferPrice(NaN)).toThrow()
  })
})
