import { json } from '@/lib/server/auth'
import { getConfiguracion } from '@/lib/server/catalogo'
import { mercadoPagoConfigurado } from '@/lib/server/mercadopago'
import { aPublico, pedidos, sincronizarPedido } from '@/lib/server/pedidos'
import { exigirUsuario } from '@/lib/server/sesion'

export const dynamic = 'force-dynamic'

/**
 * Una compra de la persona con sesión (la usa la página de confirmación al volver de Mercado Pago).
 * Si sigue pendiente de pago se consulta a Mercado Pago por si el webhook se demoró. Una venta ajena responde 404.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sesion = await exigirUsuario(req, 'pedido-get', 40)
  if ('error' in sesion) return sesion.error
  if (!/^[A-Za-z0-9]{10,40}$/.test(params.id)) return json({ error: 'No encontramos ese pedido' }, 404)
  try {
    const ref = pedidos().doc(params.id)
    let snap = await ref.get()
    if (!snap.exists || snap.data()?.uid !== sesion.uid) return json({ error: 'No encontramos ese pedido' }, 404)
    if (snap.data()?.estado === 'pendiente_pago' && snap.data()?.preferenciaId && mercadoPagoConfigurado()) {
      await sincronizarPedido(params.id)
      snap = await ref.get()
    }
    const pedido = aPublico(snap.id, snap.data()!)
    if (pedido.estado === 'transferencia_en_proceso') {
      try { pedido.instruccionesTransferencia = (await getConfiguracion()).datosTransferencia } catch { /* sin datos cargados: se coordina por WhatsApp */ }
    }
    return json({ pedido })
  } catch (e) {
    console.error('[pedidos] detalle', (e as Error).message)
    return json({ error: 'No pudimos cargar el pedido' }, 500)
  }
}
