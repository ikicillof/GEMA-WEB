import 'server-only'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import type { DocumentData } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { catalogoInicial } from '@/lib/catalogo-inicial'
import type { Product } from '@/lib/products'

// Cuánto puede tardar un cambio en verse en la web: la caché de datos (20 s) + la regeneración
// de la página (30 s) = menos de un minuto en el peor caso. Con revalidarCatalogo() es inmediato.
export const REVALIDAR_PAGINAS = 30
const REVALIDAR_DATOS = 20

const texto = (v: unknown, porDefecto = '') => (typeof v === 'string' ? v : porDefecto)
const listaTexto = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Producto + datos de logística. SOLO servidor: nunca se manda al navegador. */
export type ProductoServidor = Product & { pesoGramos: number | null; altoCm: number | null; anchoCm: number | null; largoCm: number | null }
const positivo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)

/** Documento de Firestore -> producto de la web. Devuelve null si está oculto o está mal cargado. */
function aProducto(slug: string, d: DocumentData): Product | null {
  if (d.activo !== true) return null
  if (typeof d.price !== 'number' || !Number.isFinite(d.price) || !texto(d.name)) return null
  const colorLabel = texto(d.colorLabel)
  return {
    slug,
    name: texto(d.name),
    price: d.price,
    tag: texto(d.tag),
    description: texto(d.description),
    detail: texto(d.detail),
    colors: listaTexto(d.colors),
    ...(colorLabel ? { colorLabel } : {}),
    images: listaTexto(d.images),
    ...(d.featured === true ? { featured: true } : {}),
  }
}

function aProductoServidor(slug: string, d: DocumentData): ProductoServidor | null {
  const base = aProducto(slug, d)
  return base && { ...base, pesoGramos: positivo(d.pesoGramos), altoCm: positivo(d.altoCm), anchoCm: positivo(d.anchoCm), largoCm: positivo(d.largoCm) }
}

const leerCatalogo = unstable_cache(
  async () => {
    // Un solo orderBy no necesita índice compuesto; lo oculto (activo) se filtra acá.
    const snap = await adminDb().collection('products').orderBy('orden').get()
    return snap.docs.flatMap(doc => { const p = aProductoServidor(doc.id, doc.data()); return p ? [p] : [] })
  },
  ['catalogo-v1'],
  { revalidate: REVALIDAR_DATOS, tags: ['catalogo'] },
)

const sinLogistica = ({ pesoGramos, altoCm, anchoCm, largoCm, ...producto }: ProductoServidor): Product => producto

/** Productos activos, ordenados, con logística (para calcular precios y envíos en el servidor). */
export async function getProductosServidor(): Promise<ProductoServidor[]> {
  try {
    return await leerCatalogo()
  } catch (e) {
    console.error('[catalogo] Firestore no respondió; uso el catálogo inicial:', (e as Error).message)
    return catalogoInicial.map(p => ({ ...p, pesoGramos: null, altoCm: null, anchoCm: null, largoCm: null }))
  }
}

/** Productos activos, ordenados, para la web (sin datos de logística). Si Firestore no responde, usa el catálogo inicial. */
export async function getProductos(): Promise<Product[]> {
  return (await getProductosServidor()).map(sinLogistica)
}

export async function getProducto(slug: string): Promise<Product | undefined> {
  return (await getProductos()).find(p => p.slug === slug)
}

/** Para el panel: después de crear o editar un producto, la web se actualiza al instante. */
export function revalidarCatalogo() {
  revalidateTag('catalogo')
  revalidatePath('/tienda')
  revalidatePath('/producto/[slug]', 'page')
}

/** Ajustes de la tienda (configuracion/general). Cambian poco: caché de 1 minuto. */
export const getConfiguracion = unstable_cache(
  async () => {
    const d = (await adminDb().doc('configuracion/general').get()).data() ?? {}
    const pct = typeof d.descuentoTransferenciaPct === 'number' && d.descuentoTransferenciaPct >= 0 && d.descuentoTransferenciaPct <= 50 ? d.descuentoTransferenciaPct : 10
    // Datos para pagar por transferencia (configuracion/general.datosTransferencia: alias, titular, banco) y WhatsApp de la tienda.
    const limpio = (v: unknown, max: number) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, max) : ''
    const t = d.datosTransferencia && typeof d.datosTransferencia === 'object' ? d.datosTransferencia : {}
    const alias = limpio(t.alias, 60)
    const datosTransferencia = alias ? { alias, titular: limpio(t.titular, 80), banco: limpio(t.banco, 80), provisorio: t.provisorio === true } : null
    const whatsapp = limpio(d.whatsapp, 20).replace(/\D/g, '')
    return { descuentoTransferenciaPct: pct, datosTransferencia, whatsapp: whatsapp || null }
  },
  ['configuracion-v2'],
  { revalidate: 60, tags: ['configuracion'] },
)
