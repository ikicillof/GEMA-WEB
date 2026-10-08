import { describe, it, expect, beforeEach } from 'vitest'
import { loadCart, saveCart } from './cart-storage'
import { EMPTY_CART } from './cart-types'

beforeEach(() => {
  localStorage.clear()
})

describe('cart storage', () => {
  it('returns an empty cart when nothing is stored', () => {
    expect(loadCart()).toEqual(EMPTY_CART)
  })

  it('round-trips a saved cart', () => {
    const state = { items: [{ productId: 'lumalee', slug: 'lampara-lumalee', name: 'Lámpara Lumalee', color: 'Rosa Gemma', unitPrice: 32000, quantity: 2, photo: '/products/lumalee-1.jpg' }] }
    saveCart(state)
    expect(loadCart()).toEqual(state)
  })

  it('returns an empty cart if the stored value is corrupted', () => {
    localStorage.setItem('gemma_cart_v1', 'not-json')
    expect(loadCart()).toEqual(EMPTY_CART)
  })

  it('returns an empty cart if the stored value has invalid shape', () => {
    localStorage.setItem('gemma_cart_v1', JSON.stringify({ foo: 1 }))
    expect(loadCart()).toEqual(EMPTY_CART)
  })
})
