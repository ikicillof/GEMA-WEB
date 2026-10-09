import { describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { ClearCartOnMount, LAST_ORDER_ID_KEY } from './ClearCartOnMount'
import { CartProvider } from '@/components/cart/CartProvider'
import { loadCart, saveCart } from '@/lib/cart/cart-storage'

const seededItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  saveCart({ items: [seededItem] })
})

describe('ClearCartOnMount', () => {
  it('clears the cart once hydrated when sessionStorage has a matching order id', async () => {
    sessionStorage.setItem(LAST_ORDER_ID_KEY, 'order-1')

    render(
      <CartProvider>
        <ClearCartOnMount orderId="order-1" />
      </CartProvider>
    )

    // El carrito real (sembrado en localStorage) debe hidratarse primero y
    // SOLO DESPUÉS vaciarse — si la limpieza pisara el carrito vacío previo
    // a la hidratación, este await nunca se cumpliría y el test fallaría.
    await waitFor(() => {
      expect(loadCart().items).toHaveLength(0)
    })
    expect(sessionStorage.getItem(LAST_ORDER_ID_KEY)).toBeNull()
  })

  it('does not clear the cart when the stashed order id does not match', async () => {
    sessionStorage.setItem(LAST_ORDER_ID_KEY, 'some-other-order')

    render(
      <CartProvider>
        <ClearCartOnMount orderId="order-1" />
      </CartProvider>
    )

    await waitFor(() => {
      expect(loadCart().items).toHaveLength(1)
    })
  })

  it('does not clear the cart when nothing was stashed (e.g. a bookmarked/revisited link)', async () => {
    render(
      <CartProvider>
        <ClearCartOnMount orderId="order-1" />
      </CartProvider>
    )

    await waitFor(() => {
      expect(loadCart().items).toHaveLength(1)
    })
  })
})
