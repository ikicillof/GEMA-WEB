import { describe, it, expect } from 'vitest'
import { canStartCheckout, findUnavailableItems } from './guards'
import type { CartItem } from '@/lib/cart/cart-types'
import type { Product } from '@/types/product'

const item: CartItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

const productAvailable: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: '',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: true }],
  photos: [],
  available: true,
}

describe('canStartCheckout', () => {
  it('is false for an empty cart', () => {
    expect(canStartCheckout([])).toBe(false)
  })

  it('is true when there is at least one item', () => {
    expect(canStartCheckout([item])).toBe(true)
  })
})

describe('findUnavailableItems', () => {
  it('returns an empty array when every item is still available', () => {
    expect(findUnavailableItems([item], [productAvailable])).toEqual([])
  })

  it('flags an item whose color became unavailable after it was added to the cart', () => {
    const nowUnavailable: Product = {
      ...productAvailable,
      colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: false }],
    }
    expect(findUnavailableItems([item], [nowUnavailable])).toEqual([item])
  })

  it('flags an item whose product no longer exists in the catalog', () => {
    expect(findUnavailableItems([item], [])).toEqual([item])
  })

  it('flags an item whose product became fully unavailable (not just one color)', () => {
    const discontinued: Product = {
      ...productAvailable,
      available: false,
    }
    expect(findUnavailableItems([item], [discontinued])).toEqual([item])
  })
})
