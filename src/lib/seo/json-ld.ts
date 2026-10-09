import type { Product } from '@/types/product'

export function buildProductJsonLd(product: Product, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product' as const,
    name: product.name,
    description: product.description,
    image: product.photos,
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
