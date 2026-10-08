'use client'

import { useState } from 'react'
import type { Product, Category } from '@/types/product'
import { ProductCard } from '@/components/ui/ProductCard'
import { SortSelect } from './SortSelect'
import { sortProducts, type SortOption } from '@/lib/catalog-filters'

export function CategoryListingView({
  category,
  products,
}: {
  category: Category
  products: Product[]
}) {
  const [sort, setSort] = useState<SortOption>('price-asc')

  if (products.length === 0) {
    return (
      <div className="px-4 py-10 md:px-10">
        <h1 className="mb-4 text-2xl font-semibold">{category.name}</h1>
        <p>Todavía no hay productos en esta categoría.</p>
      </div>
    )
  }

  const sorted = sortProducts(products, sort)

  return (
    <div className="px-4 py-10 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <h2 className="sr-only">Productos</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {sorted.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
