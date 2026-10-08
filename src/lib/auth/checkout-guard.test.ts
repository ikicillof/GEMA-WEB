import { describe, it, expect } from 'vitest'
import { shouldRequireAuth } from './checkout-guard'

describe('shouldRequireAuth', () => {
  it('does not require auth to browse the cart', () => {
    expect(shouldRequireAuth('cart', false)).toBe(false)
  })

  it('does not require auth to pick a shipping zone', () => {
    expect(shouldRequireAuth('shipping', false)).toBe(false)
  })

  it('requires auth only at the payment step, when not authenticated', () => {
    expect(shouldRequireAuth('payment', false)).toBe(true)
  })

  it('does not require auth at the payment step when already authenticated', () => {
    expect(shouldRequireAuth('payment', true)).toBe(false)
  })
})
