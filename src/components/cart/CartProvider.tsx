'use client'

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { cartReducer } from '@/lib/cart/cart-reducer'
import { loadCart, saveCart } from '@/lib/cart/cart-storage'
import { EMPTY_CART, type CartItem } from '@/lib/cart/cart-types'

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, color: string) => void
  updateQuantity: (productId: string, color: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART, loadCart)

  useEffect(() => {
    saveCart(state)
  }, [state])

  const value: CartContextValue = {
    items: state.items,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (productId, color) => dispatch({ type: 'REMOVE_ITEM', productId, color }),
    updateQuantity: (productId, color, quantity) =>
      dispatch({ type: 'UPDATE_QUANTITY', productId, color, quantity }),
    clear: () => dispatch({ type: 'CLEAR' }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
