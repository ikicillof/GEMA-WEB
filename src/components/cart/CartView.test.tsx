import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartView } from './CartView'
import { CartItemRow } from './CartItemRow'
import { CartProvider } from '@/components/cart/CartProvider'
import * as cartStorage from '@/lib/cart/cart-storage'

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
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the empty state when there are no items', () => {
    render(
      <CartProvider>
        <CartView />
      </CartProvider>
    )
    expect(screen.getByText(/todavía no agregaste nada/i)).toBeInTheDocument()
  })

  it('shows items and the computed total and transfer total', () => {
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({
      items: [mockItem],
    })
    render(
      <CartProvider>
        <CartView />
      </CartProvider>
    )
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    // 2 x $32.000 = $64.000; transfer total = computeTransferPrice(64000) = $57.600
    expect(screen.getByText(/64\.000/)).toBeInTheDocument()
    expect(screen.getByText(/57\.600/)).toBeInTheDocument()
  })

  it('removes an item when its remove button is clicked', () => {
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({
      items: [mockItem],
    })
    render(
      <CartProvider>
        <CartView />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(screen.getByText(/todavía no agregaste nada/i)).toBeInTheDocument()
  })
})

describe('CartItemRow', () => {
  it('renders item details correctly', () => {
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
    expect(screen.getByText('Rosa Gemma')).toBeInTheDocument()
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
  })

  it('does not call onUpdateQuantity when clearing the input', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    const { getByDisplayValue } = render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    const input = getByDisplayValue('2') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(onUpdateQuantity).not.toHaveBeenCalled()
  })

  it('clamps 0 to 1 and calls onUpdateQuantity', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    const { getByDisplayValue } = render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    const input = getByDisplayValue('2') as HTMLInputElement
    fireEvent.change(input, { target: { value: '0' } })
    expect(onUpdateQuantity).toHaveBeenCalledWith(1)
  })

  it('clamps negative numbers to 1 and calls onUpdateQuantity', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    const { getByDisplayValue } = render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    const input = getByDisplayValue('2') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-5' } })
    expect(onUpdateQuantity).toHaveBeenCalledWith(1)
  })

  it('rounds fractional quantities and calls onUpdateQuantity', () => {
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()
    const { getByDisplayValue } = render(
      <CartItemRow
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )
    const input = getByDisplayValue('2') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2.5' } })
    expect(onUpdateQuantity).toHaveBeenCalledWith(3)
  })

  it('calls onRemove when the remove button is clicked', () => {
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
