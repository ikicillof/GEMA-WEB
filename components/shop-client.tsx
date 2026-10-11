'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ProductCard } from './product-card'
import { Product } from '@/lib/products'

export function ShopClient({ products }: { products: Product[] }) {
  const [sort, setSort] = useState('featured')
  const sorted = useMemo(() => [...products].sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : Number(Boolean(b.featured)) - Number(Boolean(a.featured))), [products, sort])
  return <><div className="shop-toolbar"><span className="shop-count">{products.length} piezas para encontrar tu próxima favorita</span><div className="select-wrap"><select className="sort-select" value={sort} onChange={event => setSort(event.target.value)} aria-label="Ordenar productos"><option value="featured">Ordenar por destacados</option><option value="low">Menor precio</option><option value="high">Mayor precio</option><option value="name">Nombre A-Z</option></select><ChevronDown size={15} /></div></div><h2 className="sr-only">Productos</h2><div className="shop-grid">{sorted.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div></>
}
