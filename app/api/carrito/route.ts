import { FieldValue } from 'firebase-admin/firestore'
import type { ItemPedido } from '@/lib/envio'
import { adminDb } from '@/lib/firebase/admin'
import { json } from '@/lib/server/auth'
import { resolverItems } from '@/lib/server/carrito'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { CarritoSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

const doc = (uid: string) => adminDb().collection('carritos').doc(uid)
const aItems = (lineas: { slug: string; color: string; quantity: number }[]): ItemPedido[] => lineas.map(l => ({ slug: l.slug, color: l.color, cantidad: l.quantity }))

/** Carrito guardado en la cuenta, con precios y datos actuales del catálogo. */
export async function GET(req: Request) {
  const sesion = await exigirUsuario(req, 'carrito-get')
  if ('error' in sesion) return sesion.error
  try {
    const guardado = (await doc(sesion.uid).get()).data()?.items
    const items = Array.isArray(guardado) ? (guardado as ItemPedido[]) : []
    return json({ items: (await resolverItems(items)).lineas })
  } catch (e) {
    console.error('[carrito] GET', (e as Error).message)
    return json({ error: 'No pudimos cargar tu carrito' }, 500)
  }
}

/**
 * Guarda el carrito en la cuenta.
 *  - fusionar: al iniciar sesión; une el carrito de este navegador con el guardado (se queda con la mayor cantidad de cada ítem).
 *  - reemplazar: cambios posteriores; lo guardado pasa a ser exactamente lo que se manda.
 * Siempre se guardan solo ítems válidos del catálogo; los precios nunca se aceptan del navegador.
 */
export async function PUT(req: Request) {
  const sesion = await exigirUsuario(req, 'carrito-put', 60)
  if ('error' in sesion) return sesion.error
  const parsed = CarritoSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)

  try {
    let items: ItemPedido[] = parsed.data.items
    if (parsed.data.modo === 'fusionar') {
      const guardado = (await doc(sesion.uid).get()).data()?.items
      const unidos = new Map<string, ItemPedido>()
      for (const it of [...(Array.isArray(guardado) ? (guardado as ItemPedido[]) : []), ...items]) {
        const k = `${it.slug}|${it.color}`, previo = unidos.get(k)
        unidos.set(k, { ...it, cantidad: Math.max(previo?.cantidad ?? 0, it.cantidad) })
      }
      items = Array.from(unidos.values())
    }
    const { lineas } = await resolverItems(items)
    await doc(sesion.uid).set({ items: aItems(lineas), actualizadoEn: FieldValue.serverTimestamp() })
    return json({ items: lineas })
  } catch (e) {
    console.error('[carrito] PUT', (e as Error).message)
    return json({ error: 'No pudimos guardar tu carrito' }, 500)
  }
}
