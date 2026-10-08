'use client'

import { useCart } from '@/components/cart/CartProvider'
import { Header } from './Header'

export function HeaderWithCartCount() {
  const { items } = useCart()
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return <Header cartCount={cartCount} />
}
