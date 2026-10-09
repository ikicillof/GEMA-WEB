import type { Product, Category } from '@/types/product'

export type SitemapEntry = { url: string }

export function buildSitemapEntries(
  baseUrl: string,
  products: Product[],
  categories: Category[]
): SitemapEntry[] {
  return [
    { url: baseUrl },
    ...categories.map((c) => ({ url: `${baseUrl}/categoria/${c.slug}` })),
    ...products.map((p) => ({ url: `${baseUrl}/producto/${p.slug}` })),
  ]
}
