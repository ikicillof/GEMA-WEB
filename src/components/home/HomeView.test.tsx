import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeView } from './HomeView'
import type { Product } from '@/types/product'

const products: Product[] = [
  {
    id: 'lumalee',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: 'Una nube con luz.',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: true }],
    photos: ['/products/lumalee-1.jpg'],
    available: true,
  },
]

describe('HomeView', () => {
  it('shows the brand hero copy and the main CTA', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText(/hacemos que cada rincón brille/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver productos/i })).toHaveAttribute(
      'href',
      '/categoria/lamparas'
    )
  })

  it('shows the trust banners', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText(/envíos a todo el país/i)).toBeInTheDocument()
  })

  it('renders the featured products grid', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
  })
})
