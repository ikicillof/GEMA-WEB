import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { CancelarSchema } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'
import { avisarVentaCancelada } from '@/lib/server/emails'
import { cancelarVenta } from '@/lib/server/ventas-admin'

export const dynamic = 'force-dynamic'

/** Cancela una venta que todavía no se cobró, con motivo. Solo admin o creador. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'cancelar', minRol: 'admin', maxPorMinuto: 20 })
  if ('error' in r) return r.error
  if (!/^[A-Za-z0-9]{10,40}$/.test(params.id)) return json({ error: 'No encontramos esa venta' }, 404)
  const parsed = CancelarSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Escribí el motivo de la cancelación (mínimo 3 letras).' }, 400)
  try {
    const res = await cancelarVenta(params.id, parsed.data.motivo, r.staff)
    if (res === 'no_existe') return json({ error: 'No encontramos esa venta' }, 404)
    if (res === 'estado_invalido') return json({ error: 'Solo se pueden cancelar ventas que todavía no se cobraron' }, 409)
    await auditar(r.staff, 'venta-cancelar', { pedidoId: params.id, motivo: parsed.data.motivo })
    // Avisa al cliente. Nunca lanza: si Resend falla, queda anotado en la venta (mailsPendientes) y se reintenta desde el panel.
    await avisarVentaCancelada(params.id)
    return json({ ok: true, estado: 'cancelado' })
  } catch (e) {
    console.error('[admin/cancelar]', (e as Error).message)
    return json({ error: 'No pudimos cancelar la venta' }, 500)
  }
}
