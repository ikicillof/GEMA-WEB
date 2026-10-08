'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Product } from '@/types/product'
import { formatCurrencyARS } from '@/lib/format'
import { TransferPriceBadge } from '@/components/ui/TransferPriceBadge'
import { Button } from '@/components/ui/Button'
import { ColorVariantPicker } from './ColorVariantPicker'
import { useCart } from '@/components/cart/CartProvider'

export function ProductDetailView({ product }: { product: Product }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0])
  const { addItem } = useCart()

  return (
    <div className="grid gap-6 px-4 py-10 md:grid-cols-2 md:px-10">
      <div className="grid gap-3">
        {product.photos.map((photo) => (
          <div key={photo} className="relative aspect-square overflow-hidden rounded-lg">
            <Image src={photo} alt={product.name} fill className="object-cover" />
          </div>
        ))}
      </div>
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mb-4 text-text/80">{product.description}</p>
        <p className="mb-2 text-lg">{formatCurrencyARS(product.price)}</p>
        <div className="mb-4">
          <TransferPriceBadge price={product.price} />
        </div>
        <div className="mb-6">
          <ColorVariantPicker
            colors={product.colors}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />
        </div>
        <Button
          variant="primary"
          disabled={!selectedColor.available}
          onClick={() =>
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              color: selectedColor.name,
              unitPrice: product.price,
              quantity: 1,
              photo: product.photos[0],
            })
          }
        >
          Agregar al carrito
        </Button>
      </div>
    </div>
  )
}
