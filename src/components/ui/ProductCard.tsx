import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types/product'
import { formatCurrencyARS } from '@/lib/format'
import { TransferPriceBadge } from './TransferPriceBadge'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.slug}`}
      className="block rounded-lg bg-[#17171A] p-4 shadow-[var(--shadow-float)]"
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg">
        <Image
          src={product.photos[0]}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <h3 className="mb-1 font-semibold">{product.name}</h3>
      <p className="mb-2 text-sm">{formatCurrencyARS(product.price)}</p>
      <TransferPriceBadge price={product.price} />
      <div className="mt-3 flex gap-2">
        {product.colors.map((color) => (
          <span
            key={color.name}
            data-testid="color-swatch"
            title={color.name}
            className={`h-5 w-5 rounded-full border border-text/30 ${
              color.available ? '' : 'opacity-40'
            }`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </Link>
  )
}
