'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/cart/CartProvider'

export function ClearCartOnMount() {
  const { clear } = useCart()

  useEffect(() => {
    clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
