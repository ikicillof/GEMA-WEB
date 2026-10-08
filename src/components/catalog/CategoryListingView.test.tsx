import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryListingView } from './CategoryListingView'
import type { Product, Category } from '@/types/product'

const category: Category = { slug: 'lamparas', name: 'Lámparas', order: 1 }
const products: Product[] = [
  {
    id: '1',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: '',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [],
    photos: ['/products/lumalee-1.jpg'],
    available: true,
  },
]

describe('CategoryListingView', () => {
  it('shows the category name as the title', () => {
    render(<CategoryListingView category={category} products={products} />)
    expect(screen.getByRole('heading', { name: 'Lámparas' })).toBeInTheDocument()
  })

  it('renders a card per product', () => {
    render(<CategoryListingView category={category} products={products} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
  })

  it('shows an empty state when there are no products', () => {
    render(<CategoryListingView category={category} products={[]} />)
    expect(screen.getByText(/todavía no hay productos/i)).toBeInTheDocument()
  })
})
