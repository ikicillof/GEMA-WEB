import { adminDb } from '@/lib/firebase/admin'
import { exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { aResumen } from '@/lib/server/ventas-admin'

export const dynamic = 'force-dynamic'

const LIMITE = 500

/** Las últimas ventas (más nuevas primero). Los filtros y el buscador se aplican en el panel sobre estas. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'ventas', permiso: 'ventas:ver' })
  if ('error' in r) return r.error
  try {
    const snap = await adminDb().collection('orders').orderBy('creadoEn', 'desc').limit(LIMITE).get()
    return json({ ventas: snap.docs.map(d => aResumen(d.id, d.data())), limite: LIMITE })
  } catch (e) {
    console.error('[admin/ventas] listar', (e as Error).message)
    return json({ error: 'No pudimos cargar las ventas' }, 500)
  }
}
