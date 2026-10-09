import type { MetadataRoute } from 'next'
import { getAllProducts, getAllCategories } from '@/lib/catalog'
import { buildSitemapEntries } from '@/lib/seo/sitemap'
import { getSiteUrl } from '@/lib/seo/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const entries = buildSitemapEntries(baseUrl, getAllProducts(), getAllCategories())
  return entries.map((entry) => ({ url: entry.url }))
}
