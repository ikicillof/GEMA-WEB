import { describe, it, expect } from 'vitest'
import { buildSitemapEntries } from './sitemap'
import type { Product, Category } from '@/types/product'

const products: Product[] = [
  {
    id: '1',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: '',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [],
    photos: [],
    available: true,
  },
]
const categories: Category[] = [{ slug: 'lamparas', name: 'Lámparas', order: 1 }]

describe('buildSitemapEntries', () => {
  it('includes the home, each category, and each product', () => {
    const entries = buildSitemapEntries('https://gemma.ar', products, categories)
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://gemma.ar')
    expect(urls).toContain('https://gemma.ar/categoria/lamparas')
    expect(urls).toContain('https://gemma.ar/producto/lampara-lumalee')
  })
})
