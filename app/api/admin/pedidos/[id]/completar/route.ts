import { adminAuth } from '@/lib/firebase/admin'
import { json, resolverRol, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { completarTransferencia } from '@/lib/server/pedidos'
import { ipDe, limitar } from '@/lib/server/rate-limit'
import { RANGO } from '@/lib/roles'

export const dynamic = 'force-dynamic'

/**
 * La dueña marca como completada una venta por transferencia (ya llegó la plata): pasa a `completado`
 * y el cliente recibe el mail «Recibimos tu transferencia». Solo admin o creador, con el rol leído fresco desde Firebase.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!limitar(`completar:${ipDe(req)}`, 30)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)
  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return json({ error: 'No autorizado' }, 401)
  if (!/^[A-Za-z0-9]{10,40}$/.test(params.id)) return json({ error: 'No encontramos esa venta' }, 404)
  try {
    const actor = resolverRol(await adminAuth().getUser(decoded.uid))
    if (RANGO[actor.rol] < RANGO.admin) return json({ error: 'No tenés permiso para esto' }, 403)
    const r = await completarTransferencia(params.id, decoded.email ?? decoded.uid)
    if (r === 'no_existe') return json({ error: 'No encontramos esa venta' }, 404)
    if (r === 'estado_invalido') return json({ error: 'Solo se puede completar una venta que espera su transferencia' }, 409)
    return json({ ok: true, estado: 'completado' })
  } catch (e) {
    console.error('[completar]', (e as Error).message)
    return json({ error: 'No pudimos completar la venta' }, 500)
  }
}
