import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'
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
  photos: ['/products/lumalee-1.jpg'],
  available: true,
}

describe('ProductCard', () => {
  it('shows the product name and both prices', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
    expect(screen.getByText(/28\.800/)).toBeInTheDocument()
  })

  it('links to the product detail page', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/producto/lampara-lumalee'
    )
  })

  it('renders a swatch per color, dimming unavailable ones', () => {
    render(<ProductCard product={product} />)
    const swatches = screen.getAllByTestId('color-swatch')
    expect(swatches).toHaveLength(2)
    expect(swatches[1]).toHaveClass('opacity-40')
  })

  it('labels each color swatch with its name and availability for screen readers', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByLabelText('Rosa Gemma')).toBeInTheDocument()
    expect(screen.getByLabelText('Amarillo (agotado)')).toBeInTheDocument()
  })
})
