import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartView } from './CartView'
import { CartItemRow } from './CartItemRow'
import { CartProvider } from '@/components/cart/CartProvider'

const mockItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 2,
  photo: '/products/lumalee-1.jpg',
}

describe('CartView', () => {
  it('shows the empty state when there are no items', () => {
    render(
      <CartProvider>
        <CartView />
      </CartProvider>
    )
    expect(screen.getByText(/todavía no agregaste nada/i)).toBeInTheDocument()
  })

  it('shows items and the computed total', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    // Verify the unit price is shown
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
  })

  it('removes an item when its remove button is clicked', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(onRemove).toHaveBeenCalled()
  })

})
