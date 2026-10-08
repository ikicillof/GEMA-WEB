import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductDetailView } from './ProductDetailView'
import { CartProvider, useCart } from '@/components/cart/CartProvider'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: 'Una nube con luz.',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [
    { name: 'Rosa Gemma', hex: '#FF4DA6', available: true },
    { name: 'Amarillo', hex: '#FFD93D', available: false },
  ],
  photos: ['/products/lumalee-1.jpg', '/products/lumalee-2.jpg'],
  available: true,
}

function CartSpy({ onItems }: { onItems: (count: number) => void }) {
  const { items } = useCart()
  onItems(items.reduce((sum, i) => sum + i.quantity, 0))
  return null
}

describe('ProductDetailView', () => {
  it('shows the name, both prices, and the gallery', () => {
    render(
      <CartProvider>
        <ProductDetailView product={product} />
      </CartProvider>
    )
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
    expect(screen.getByText(/28\.800/)).toBeInTheDocument()
  })

  it('disables "agregar al carrito" when the selected color is unavailable', () => {
    render(
      <CartProvider>
        <ProductDetailView product={product} />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('radio', { name: /Amarillo/ }))
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeDisabled()
  })

  it('adds the selected color and quantity to the cart', () => {
    let count = 0
    render(
      <CartProvider>
        <ProductDetailView product={product} />
        <CartSpy onItems={(c) => (count = c)} />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(count).toBe(1)
  })
})
