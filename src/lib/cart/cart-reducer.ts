import type { CartState, CartAction } from './cart-types'

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.productId === action.item.productId && i.color === action.item.color
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + action.item.quantity } : i
          ),
        }
      }
      return { items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(
          (i) => !(i.productId === action.productId && i.color === action.color)
        ),
      }
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, {
          type: 'REMOVE_ITEM',
          productId: action.productId,
          color: action.color,
        })
      }
      return {
        items: state.items.map((i) =>
          i.productId === action.productId && i.color === action.color
            ? { ...i, quantity: action.quantity }
            : i
        ),
      }
    }
    case 'CLEAR':
      return { items: [] }
  }
}
