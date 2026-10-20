import type { MetadataRoute } from 'next'
import { getProductosSitemap } from '@/lib/server/catalogo'
import { PAGINAS_PUBLICAS, ULTIMA_ACTUALIZACION_PAGINAS, urlDelSitio } from '@/lib/seo'

// Se arma en cada pedido y la lista de productos viene de una caché de 5 minutos; con un producto nuevo u oculto se actualiza sola.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = urlDelSitio()
  const productos = await getProductosSitemap()
  return [
    ...PAGINAS_PUBLICAS.map(p => ({ url: `${url}${p.ruta === '/' ? '' : p.ruta}`, lastModified: new Date(ULTIMA_ACTUALIZACION_PAGINAS), changeFrequency: p.cambia, priority: p.prioridad })),
    ...productos.map(p => ({ url: `${url}/producto/${p.slug}`, lastModified: p.actualizado ? new Date(p.actualizado) : new Date(ULTIMA_ACTUALIZACION_PAGINAS), changeFrequency: 'weekly' as const, priority: 0.8 })),
  ]
}
