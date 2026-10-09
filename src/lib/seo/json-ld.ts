import type { Product } from '@/types/product'

export interface ProductJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description: string
  image: string[]
  sku: string
  offers: {
    '@type': 'Offer'
    price: number
    priceCurrency: 'ARS'
    availability: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock'
    url: string
  }
}

export function buildProductJsonLd(product: Product, url: string): ProductJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product' as const,
    name: product.name,
    description: product.description,
    image: product.photos.map((photo) => new URL(photo, url).toString()),
    sku: product.id,
    offers: {
      '@type': 'Offer' as const,
      price: product.price,
      priceCurrency: 'ARS',
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  }
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
