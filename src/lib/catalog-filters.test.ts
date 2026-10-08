import { describe, it, expect } from 'vitest'
import { sortProducts } from './catalog-filters'
import type { Product } from '@/types/product'

const base: Omit<Product, 'id' | 'slug' | 'name' | 'price'> = {
  description: '',
  categorySlug: 'lamparas',
  colors: [],
  photos: [],
  available: true,
}

const products: Product[] = [
  { ...base, id: '1', slug: 'b', name: 'Beta', price: 20000 },
  { ...base, id: '2', slug: 'a', name: 'Alfa', price: 10000 },
  { ...base, id: '3', slug: 'c', name: 'Charlie', price: 30000 },
]

describe('sortProducts', () => {
  it('sorts by price ascending', () => {
    const sorted = sortProducts(products, 'price-asc')
    expect(sorted.map((p) => p.id)).toEqual(['2', '1', '3'])
  })

  it('sorts by price descending', () => {
    const sorted = sortProducts(products, 'price-desc')
    expect(sorted.map((p) => p.id)).toEqual(['3', '1', '2'])
  })

  it('sorts by name ascending', () => {
    const sorted = sortProducts(products, 'name-asc')
    expect(sorted.map((p) => p.id)).toEqual(['2', '1', '3'])
  })

  it('does not mutate the input array', () => {
    const original = [...products]
    sortProducts(products, 'price-asc')
    expect(products).toEqual(original)
  })
})
