import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('links the logo to home and shows nav items', () => {
    render(<Header cartCount={0} />)
    expect(screen.getByRole('link', { name: /gemma/i })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getByRole('link', { name: /categorías/i })).toBeInTheDocument()
  })

  it('shows the cart count badge when there are items', () => {
    render(<Header cartCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides the cart count badge when the cart is empty', () => {
    render(<Header cartCount={0} />)
    expect(screen.queryByTestId('cart-count')).not.toBeInTheDocument()
  })

  it('includes the cart count in the accessible name when items are present', () => {
    render(<Header cartCount={3} />)
    expect(screen.getByRole('link', { name: 'Carrito, 3 artículos' })).toBeInTheDocument()
  })

  it('uses a plain accessible name when the cart is empty', () => {
    render(<Header cartCount={0} />)
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeInTheDocument()
  })
})
