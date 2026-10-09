import type { MetadataRoute } from 'next'
import { getAllProducts, getAllCategories } from '@/lib/catalog'
import { buildSitemapEntries } from '@/lib/seo/sitemap'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gemma.ar'
  const entries = buildSitemapEntries(baseUrl, getAllProducts(), getAllCategories())
  return entries.map((entry) => ({ url: entry.url, lastModified: new Date() }))
}
