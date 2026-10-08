import type { Product } from '@/types/product'

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc'

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price)
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
  }
}
