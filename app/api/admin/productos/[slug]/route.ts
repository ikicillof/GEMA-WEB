import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { ProductoSchema, SLUG_REGEX } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'
import { revalidarCatalogo } from '@/lib/server/catalogo'
import { medidasProvisorias } from '@/lib/server/productos-admin'

export const dynamic = 'force-dynamic'

const ref = (slug: string) => adminDb().collection('products').doc(slug)
const noEncontrado = () => json({ error: 'No encontramos ese producto' }, 404)

/** Un producto completo para el formulario de edición. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const r = await exigirStaff(req, { ruta: 'producto', permiso: 'productos:ver' })
  if ('error' in r) return r.error
  if (!SLUG_REGEX.test(params.slug)) return noEncontrado()
  try {
    const snap = await ref(params.slug).get()
    if (!snap.exists) return noEncontrado()
    const x = snap.data()!
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    return json({
      producto: {
        slug: snap.id, name: x.name ?? '', price: x.price ?? 0, tag: x.tag ?? '', categoria: x.categoria ?? '', description: x.description ?? '', detail: x.detail ?? '',
        colors: Array.isArray(x.colors) ? x.colors : [], colorLabel: x.colorLabel ?? '', images: Array.isArray(x.images) ? x.images : [], modelo3d: x.modelo3d ?? null,
        featured: x.featured === true, activo: x.activo === true, orden: x.orden ?? 0,
        pesoGramos: num(x.pesoGramos), altoCm: num(x.altoCm), anchoCm: num(x.anchoCm), largoCm: num(x.largoCm), medidasProvisorias: x.medidasProvisorias === true,
      },
    })
  } catch (e) {
    console.error('[admin/producto] leer', (e as Error).message)
    return json({ error: 'No pudimos cargar el producto' }, 500)
  }
}

/** Guarda los cambios (también oculta o muestra con `activo`). Solo admin o creador. */
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const r = await exigirStaff(req, { ruta: 'producto-editar', minRol: 'admin', maxPorMinuto: 60 })
  if ('error' in r) return r.error
  if (!SLUG_REGEX.test(params.slug)) return noEncontrado()
  const parsed = ProductoSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá los datos del producto', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  const { confirmarMedidas, ...datos } = parsed.data
  try {
    const snap = await ref(params.slug).get()
    if (!snap.exists) return noEncontrado()
    await ref(params.slug).update({ ...datos, medidasProvisorias: medidasProvisorias(snap.data()!, datos, confirmarMedidas), actualizadoEn: FieldValue.serverTimestamp() })
    revalidarCatalogo()
    await auditar(r.staff, 'producto-editar', { slug: params.slug })
    return json({ ok: true })
  } catch (e) {
    console.error('[admin/producto] guardar', (e as Error).message)
    return json({ error: 'No pudimos guardar el producto' }, 500)
  }
}

/** Elimina el producto (el panel pide confirmación). Las ventas ya hechas conservan su copia de los datos. */
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const r = await exigirStaff(req, { ruta: 'producto-eliminar', minRol: 'admin', maxPorMinuto: 20 })
  if ('error' in r) return r.error
  if (!SLUG_REGEX.test(params.slug)) return noEncontrado()
  try {
    const snap = await ref(params.slug).get()
    if (!snap.exists) return noEncontrado()
    await ref(params.slug).delete()
    revalidarCatalogo()
    await auditar(r.staff, 'producto-eliminar', { slug: params.slug, nombre: String(snap.data()?.name ?? '') })
    return json({ ok: true })
  } catch (e) {
    console.error('[admin/producto] eliminar', (e as Error).message)
    return json({ error: 'No pudimos eliminar el producto' }, 500)
  }
}
