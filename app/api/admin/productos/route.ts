import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { ProductoSchema, SLUG_REGEX, slugDe } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'
import { revalidarCatalogo } from '@/lib/server/catalogo'
import { medidasProvisorias } from '@/lib/server/productos-admin'

export const dynamic = 'force-dynamic'

const productos = () => adminDb().collection('products')

/** Lista completa (activos y ocultos) para el panel. Colaboradores: solo con el permiso productos:ver. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'productos', permiso: 'productos:ver' })
  if ('error' in r) return r.error
  try {
    const snap = await productos().orderBy('orden').get()
    return json({
      productos: snap.docs.map(d => {
        const x = d.data()
        return {
          slug: d.id, name: x.name ?? '', price: x.price ?? 0, categoria: x.categoria ?? '', activo: x.activo === true, orden: x.orden ?? 0,
          image: Array.isArray(x.images) ? (x.images[0] ?? '') : '', medidasProvisorias: x.medidasProvisorias === true,
          actualizadoEn: x.actualizadoEn instanceof Timestamp ? x.actualizadoEn.toDate().toISOString() : null,
        }
      }),
    })
  } catch (e) {
    console.error('[admin/productos] listar', (e as Error).message)
    return json({ error: 'No pudimos cargar los productos' }, 500)
  }
}

/** Crea un producto (admin o creador). El identificador sale del nombre y no se puede cambiar después. */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'productos-crear', minRol: 'admin', maxPorMinuto: 30 })
  if ('error' in r) return r.error
  const parsed = ProductoSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá los datos del producto', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  const { confirmarMedidas, ...datos } = parsed.data
  try {
    const base = slugDe(datos.name) || 'producto'
    let slug = base
    for (let n = 2; (await productos().doc(slug).get()).exists; n++) slug = `${base}-${n}`
    if (!SLUG_REGEX.test(slug)) return json({ error: 'El nombre no sirve para generar la dirección del producto' }, 400)
    await productos().doc(slug).create({ ...datos, medidasProvisorias: medidasProvisorias(null, datos, confirmarMedidas), actualizadoEn: FieldValue.serverTimestamp() })
    revalidarCatalogo()
    await auditar(r.staff, 'producto-crear', { slug })
    return json({ slug }, 201)
  } catch (e) {
    console.error('[admin/productos] crear', (e as Error).message)
    return json({ error: 'No pudimos crear el producto' }, 500)
  }
}
