import { auditar, exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { completarTransferencia } from '@/lib/server/pedidos'

export const dynamic = 'force-dynamic'

/**
 * La dueña marca como completada una venta por transferencia (ya llegó la plata): pasa a `completado`
 * y el cliente recibe el mail «Recibimos tu transferencia». Solo admin o creador, con el rol leído fresco desde Firebase.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'completar', minRol: 'admin', maxPorMinuto: 30 })
  if ('error' in r) return r.error
  if (!/^[A-Za-z0-9]{10,40}$/.test(params.id)) return json({ error: 'No encontramos esa venta' }, 404)
  try {
    const res = await completarTransferencia(params.id, r.staff.email || r.staff.uid)
    if (res === 'no_existe') return json({ error: 'No encontramos esa venta' }, 404)
    if (res === 'estado_invalido') return json({ error: 'Solo se puede completar una venta que espera su transferencia' }, 409)
    await auditar(r.staff, 'venta-completar', { pedidoId: params.id })
    return json({ ok: true, estado: 'completado' })
  } catch (e) {
    console.error('[completar]', (e as Error).message)
    return json({ error: 'No pudimos completar la venta' }, 500)
  }
}
