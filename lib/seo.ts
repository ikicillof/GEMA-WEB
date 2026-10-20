// SEO: dominio canónico, URLs absolutas y datos estructurados (JSON-LD). Sin secretos: lo usan servidor y navegador.
import type { Metadata } from 'next'
import { esMarcador, VENDEDORA } from '@/lib/vendedora'

/** Único dominio que se indexa. Cualquier otro host (*.netlify.app, localhost) sale con noindex. */
export const DOMINIO_CANONICO = 'gemma-oficial.com.ar'

/** URL pública del sitio: SITE_URL si está cargada; si no, el dominio canónico. */
export function urlDelSitio(): string {
  const v = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  return v && /^https?:\/\//.test(v) ? v : `https://${DOMINIO_CANONICO}`
}

/** ¿Este host es el dominio real (sin www; www se redirige al dominio sin www)? */
export const esDominioCanonico = (host: string | null | undefined) => (host ?? '').toLowerCase().replace(/:\d+$/, '') === DOMINIO_CANONICO

/** Última vez que cambió el contenido de las páginas fijas (para el sitemap). Actualizar cuando se edite su texto. */
export const ULTIMA_ACTUALIZACION_PAGINAS = '2026-10-20'

export const MARCA = {
  nombre: 'Gemma',
  lema: 'Hacemos que cada rincón brille',
  descripcion: 'Objetos de diseño impresos en 3D, hechos a pedido y en el color que elegís, para que cada rincón de tu casa se sienta más hogar.',
}

/** Página pública que indexan los buscadores: ruta, prioridad y cada cuánto cambia. */
export const PAGINAS_PUBLICAS = [
  { ruta: '/', prioridad: 1, cambia: 'weekly' as const },
  { ruta: '/tienda', prioridad: 0.9, cambia: 'daily' as const },
  { ruta: '/quienes-somos', prioridad: 0.6, cambia: 'monthly' as const },
  { ruta: '/contacto', prioridad: 0.6, cambia: 'monthly' as const },
  { ruta: '/terminos', prioridad: 0.3, cambia: 'yearly' as const },
  { ruta: '/privacidad', prioridad: 0.3, cambia: 'yearly' as const },
  { ruta: '/devoluciones', prioridad: 0.4, cambia: 'yearly' as const },
  { ruta: '/arrepentimiento', prioridad: 0.3, cambia: 'yearly' as const },
]

/** Imagen de producto -> URL absoluta lista para Open Graph (1200x630). Cloudinary se recorta/ajusta con su propia URL. */
export function imagenParaCompartir(src: string | undefined): string | null {
  if (!src) return null
  if (/^https?:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(src)) return src.replace('/image/upload/', '/image/upload/c_pad,b_rgb:FFF9F5,w_1200,h_630,f_jpg,q_auto/')
  if (/^https?:\/\//.test(src)) return src
  return `${urlDelSitio()}${src.startsWith('/') ? '' : '/'}${src}`
}

/** Texto corto para meta description: sin saltos de línea y de hasta ~155 letras. */
export function resumen(texto: string, max = 155): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

/** Imagen Open Graph general de la marca (public/og-gemma.png, 1200x630). */
const IMAGEN_MARCA = { url: '/og-gemma.png', width: 1200, height: 630, alt: 'Gemma: hacemos que cada rincón brille' }

/**
 * Metadatos completos de una página: title (el layout le agrega " | Gemma"), description, canonical, Open Graph y Twitter.
 * `absoluto` = el título ya es completo y no lleva la plantilla (home). `imagen` = foto del producto; sin ella va la imagen de la marca.
 */
export function metaPagina(o: { titulo: string; descripcion: string; ruta: string; imagen?: string | null; absoluto?: boolean }): Metadata {
  const titulo = o.absoluto ? o.titulo : `${o.titulo} | ${MARCA.nombre}`
  const imagenes = o.imagen ? [{ url: o.imagen, width: 1200, height: 630, alt: o.titulo }] : [IMAGEN_MARCA]
  return {
    title: o.absoluto ? { absolute: o.titulo } : o.titulo,
    description: o.descripcion,
    alternates: { canonical: o.ruta },
    openGraph: { type: 'website', locale: 'es_AR', siteName: MARCA.nombre, title: titulo, description: o.descripcion, url: o.ruta, images: imagenes },
    twitter: { card: 'summary_large_image', title: titulo, description: o.descripcion, images: imagenes.map(i => i.url) },
  }
}

/** Instagram de la marca para sameAs: solo si ya se completó (mientras sea un marcador no se publica). */
export function redesDeLaMarca(): string[] {
  return [VENDEDORA.instagram].filter(u => !esMarcador(u) && /^https:\/\//.test(u))
}

export function jsonLdOrganizacion() {
  const url = urlDelSitio()
  const redes = redesDeLaMarca()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: MARCA.nombre,
    url,
    logo: `${url}/productos/logo-full.png`,
    description: MARCA.descripcion,
    ...(redes.length ? { sameAs: redes } : {}),
  }
}

export function jsonLdProducto(p: { slug: string; name: string; description: string; price: number; images: string[] }) {
  const url = urlDelSitio()
  const imagenes = p.images.map(i => (/^https?:\/\//.test(i) ? i : `${url}${i.startsWith('/') ? '' : '/'}${i}`))
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    ...(imagenes.length ? { image: imagenes } : {}),
    brand: { '@type': 'Brand', name: MARCA.nombre },
    offers: {
      '@type': 'Offer',
      url: `${url}/producto/${p.slug}`,
      price: p.price.toFixed(2),
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock', // se fabrica a pedido, siempre se puede encargar
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: MARCA.nombre },
    },
  }
}

export function jsonLdMigas(items: { nombre: string; ruta: string }[]) {
  const url = urlDelSitio()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, item: `${url}${it.ruta}` })),
  }
}
