import { describe, it, expect } from 'vitest'
import {
  getShippingZones,
  getShippingZoneById,
  calculateShippingTotal,
} from './shipping'

describe('shipping zones', () => {
  it('returns zones ordered', () => {
    const zones = getShippingZones()
    expect(zones.map((z) => z.id)).toEqual([
      'caba',
      'resto-pais',
      'retiro-vicente-lopez',
    ])
  })

  it('finds a zone by id', () => {
    expect(getShippingZoneById('caba')?.rate).toBe(3500)
  })

  it('returns undefined for an unknown zone id', () => {
    expect(getShippingZoneById('no-existe')).toBeUndefined()
  })

  it('calculates the shipping total for a paid zone', () => {
    expect(calculateShippingTotal('resto-pais')).toBe(5500)
  })

  it('calculates 0 for the pickup zone', () => {
    expect(calculateShippingTotal('retiro-vicente-lopez')).toBe(0)
  })

  it('throws for an unknown zone id', () => {
    expect(() => calculateShippingTotal('no-existe')).toThrow()
  })
})
