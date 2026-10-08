import { describe, it, expect } from 'vitest'
import { cartReducer } from './cart-reducer'
import { EMPTY_CART, type CartItem } from './cart-types'

const lumalee: CartItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

describe('cartReducer', () => {
  it('adds a new item', () => {
    const next = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    expect(next.items).toHaveLength(1)
  })

  it('merges quantity when adding the same product+color again', () => {
    const once = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const twice = cartReducer(once, { type: 'ADD_ITEM', item: lumalee })
    expect(twice.items).toHaveLength(1)
    expect(twice.items[0].quantity).toBe(2)
  })

  it('removes an item', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const removed = cartReducer(withItem, {
      type: 'REMOVE_ITEM',
      productId: 'lumalee',
      color: 'Rosa Gemma',
    })
    expect(removed.items).toHaveLength(0)
  })

  it('updates quantity', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const updated = cartReducer(withItem, {
      type: 'UPDATE_QUANTITY',
      productId: 'lumalee',
      color: 'Rosa Gemma',
      quantity: 5,
    })
    expect(updated.items[0].quantity).toBe(5)
  })

  it('removes the item when quantity is updated to 0 or less', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const updated = cartReducer(withItem, {
      type: 'UPDATE_QUANTITY',
      productId: 'lumalee',
      color: 'Rosa Gemma',
      quantity: 0,
    })
    expect(updated.items).toHaveLength(0)
  })

  it('clears the cart', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    expect(cartReducer(withItem, { type: 'CLEAR' })).toEqual(EMPTY_CART)
  })

  it('hydrates the cart with a different state', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const differentState = { items: [{ ...lumalee, quantity: 5 }] }
    const hydrated = cartReducer(withItem, { type: 'HYDRATE', state: differentState })
    expect(hydrated).toEqual(differentState)
  })
})
