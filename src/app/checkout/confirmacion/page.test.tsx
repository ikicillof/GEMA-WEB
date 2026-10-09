import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'
import { CartProvider } from '@/components/cart/CartProvider'

describe('Checkout confirmation page', () => {
  it('shows the order id when given one in searchParams', async () => {
    const jsx = await Page({ searchParams: Promise.resolve({ order: 'order-123' }) })

    render(<CartProvider>{jsx}</CartProvider>)

    expect(await screen.findByText(/Tu pedido #order-123 fue confirmado\./)).toBeInTheDocument()
  })

  it('shows a generic confirmation message when no order id is given', async () => {
    const jsx = await Page({ searchParams: Promise.resolve({}) })

    render(<CartProvider>{jsx}</CartProvider>)

    expect(await screen.findByText(/Tu pedido fue confirmado\./)).toBeInTheDocument()
  })
})
