import { describe, it, expect } from 'vitest'
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
  getAllCategories,
  getCategoryBySlug,
} from './catalog'

describe('catalog adapter', () => {
  it('returns all products from the fixture', () => {
    expect(getAllProducts().length).toBe(3)
  })

  it('finds a product by slug', () => {
    const product = getProductBySlug('lampara-lumalee')
    expect(product?.name).toBe('Lámpara Lumalee')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getProductBySlug('no-existe')).toBeUndefined()
  })

  it('filters products by category', () => {
    const lamps = getProductsByCategory('lamparas')
    expect(lamps).toHaveLength(1)
    expect(lamps[0].slug).toBe('lampara-lumalee')
  })

  it('returns an empty array for an unknown category', () => {
    expect(getProductsByCategory('no-existe')).toEqual([])
  })

  it('returns all categories ordered', () => {
    const categories = getAllCategories()
    expect(categories.map((c) => c.slug)).toEqual([
      'lamparas',
      'organizadores',
      'calendarios',
    ])
  })

  it('finds a category by slug', () => {
    expect(getCategoryBySlug('lamparas')?.name).toBe('Lámparas')
  })

  it('returns undefined for an unknown category slug', () => {
    expect(getCategoryBySlug('no-existe')).toBeUndefined()
  })
})
