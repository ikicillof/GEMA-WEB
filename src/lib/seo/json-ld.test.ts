import { describe, it, expect } from 'vitest'
import { buildProductJsonLd, serializeJsonLd } from './json-ld'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: 'Una nube con luz.',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [],
  photos: ['/products/lumalee-1.jpg'],
  available: true,
}

describe('buildProductJsonLd', () => {
  it('builds a schema.org Product with offer and availability', () => {
    const jsonLd = buildProductJsonLd(product, 'https://gemma.ar/producto/lampara-lumalee')
    expect(jsonLd['@type']).toBe('Product')
    expect(jsonLd.offers.price).toBe(32000)
    expect(jsonLd.offers.availability).toBe('https://schema.org/InStock')
  })

  it('marks an unavailable product as OutOfStock', () => {
    const jsonLd = buildProductJsonLd(
      { ...product, available: false },
      'https://gemma.ar/producto/lampara-lumalee'
    )
    expect(jsonLd.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('serializeJsonLd', () => {
  it('escapes "<" to prevent script-tag injection', () => {
    const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(serialized).not.toContain('<')
  })
})
