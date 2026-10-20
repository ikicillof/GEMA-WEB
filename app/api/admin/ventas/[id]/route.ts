import { adminDb } from '@/lib/firebase/admin'
import { exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { aDetalle } from '@/lib/server/ventas-admin'

export const dynamic = 'force-dynamic'

/** Detalle de una venta (es la ruta del link «Ver la venta en el panel» de los mails). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'venta', permiso: 'ventas:ver' })
  if ('error' in r) return r.error
  if (!/^[A-Za-z0-9]{10,40}$/.test(params.id)) return json({ error: 'No encontramos esa venta' }, 404)
  try {
    const snap = await adminDb().collection('orders').doc(params.id).get()
    if (!snap.exists) return json({ error: 'No encontramos esa venta' }, 404)
    return json({ venta: aDetalle(snap.id, snap.data()!) })
  } catch (e) {
    console.error('[admin/venta] leer', (e as Error).message)
    return json({ error: 'No pudimos cargar la venta' }, 500)
  }
}
