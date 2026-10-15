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

const leerCatalogo = unstable_cache(
  async () => {
    // Un solo orderBy no necesita índice compuesto; lo oculto (activo) se filtra acá.
    const snap = await adminDb().collection('products').orderBy('orden').get()
    return snap.docs.flatMap(doc => { const p = aProducto(doc.id, doc.data()); return p ? [p] : [] })
  },
  ['catalogo-v1'],
  { revalidate: REVALIDAR_DATOS, tags: ['catalogo'] },
)

/** Productos activos, ordenados. Si Firestore no responde, la tienda sigue con el catálogo inicial. */
export async function getProductos(): Promise<Product[]> {
  try {
    return await leerCatalogo()
  } catch (e) {
    console.error('[catalogo] Firestore no respondió; uso el catálogo inicial:', (e as Error).message)
    return catalogoInicial
  }
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
