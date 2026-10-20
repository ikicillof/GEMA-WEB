import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { esDominioCanonico, urlDelSitio } from '@/lib/seo'

/** Solo el dominio real se indexa: en *.netlify.app y localhost robots.txt prohíbe todo. */
export default function robots(): MetadataRoute.Robots {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!esDominioCanonico(host)) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/checkout', '/mis-compras', '/mi-cuenta', '/api', '/auth', '/baja'] },
    sitemap: `${urlDelSitio()}/sitemap.xml`,
  }
}
