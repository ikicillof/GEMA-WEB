import { adminDb } from '@/lib/firebase/admin'
import { exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { aResumenArrepentimiento } from '@/lib/server/arrepentimientos-admin'

export const dynamic = 'force-dynamic'

const LIMITE = 300

/** Las últimas solicitudes de arrepentimiento (más nuevas primero). Tienen datos personales: se ven con el permiso de ventas. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'arrepentimientos', permiso: 'ventas:ver' })
  if ('error' in r) return r.error
  try {
    const snap = await adminDb().collection('arrepentimientos').orderBy('creadoEn', 'desc').limit(LIMITE).get()
    return json({ solicitudes: snap.docs.map(d => aResumenArrepentimiento(d.id, d.data())), limite: LIMITE })
  } catch (e) {
    console.error('[admin/arrepentimientos] listar', (e as Error).message)
    return json({ error: 'No pudimos cargar las solicitudes' }, 500)
  }
}
