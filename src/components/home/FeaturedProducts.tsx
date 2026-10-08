import type { Product } from '@/types/product'
import { ProductCard } from '@/components/ui/ProductCard'

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section className="px-4 py-8 md:px-10">
      <h2 className="mb-4 text-xl font-semibold">Lo más pedido</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
