import { json } from '@/lib/server/auth'
import { ErrorMercadoPago, firmaValida, obtenerPago } from '@/lib/server/mercadopago'
import { aplicarPago } from '@/lib/server/pedidos'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Webhook de Mercado Pago.
 *  1. Se rechaza (401) toda notificación sin firma x-signature válida. Sin MERCADOPAGO_WEBHOOK_SECRET configurada
 *     no hay forma de validar y se rechaza todo (503, para que quede claro que falta configurar).
 *  2. Del aviso se toma SOLO el id del pago; el estado real se consulta a Mercado Pago (GET /v1/payments/{id}).
 *  3. Es idempotente y nunca retrocede una venta pagada (ver siguienteEstado).
 * Responde 200 cuando el aviso no requiere más trabajo (tema ajeno, pago o venta inexistente) para que no reintente
 * eternamente, y 5xx cuando falló algo pasajero para que Mercado Pago lo reintente.
 */
export async function POST(req: Request) {
  if (!limitar(`mp-webhook:${ipDe(req)}`, 120)) return json({ error: 'Demasiadas solicitudes' }, 429)
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
    console.error('[mp-webhook] falta MERCADOPAGO_WEBHOOK_SECRET: no se puede validar la firma, se rechaza la notificación')
    return json({ error: 'Webhook sin configurar' }, 503)
  }

  const url = new URL(req.url)
  let cuerpo: { type?: unknown; data?: { id?: unknown } } = {}
  try { cuerpo = await req.json() } catch { /* el id puede venir solo en la URL */ }
  const idUrl = url.searchParams.get('data.id')
  const dataId = idUrl ?? (cuerpo?.data?.id != null ? String(cuerpo.data.id) : null)

  if (!firmaValida(req, idUrl)) return json({ error: 'Firma inválida' }, 401)

  const tipo = String(cuerpo?.type ?? url.searchParams.get('type') ?? '')
  if (tipo !== 'payment' || !dataId || !/^\d{1,20}$/.test(dataId)) return json({ ok: true, ignorado: true })

  try {
    const pago = await obtenerPago(dataId)
    if (!pago.external_reference) return json({ ok: true, ignorado: true })
    const resultado = await aplicarPago(pago.external_reference, pago)
    return json({ ok: true, resultado })
  } catch (e) {
    if (e instanceof ErrorMercadoPago && (e.status === 404 || e.status === 400)) return json({ ok: true, ignorado: true }) // p. ej. el simulador de notificaciones
    console.error('[mp-webhook]', (e as Error).message)
    return json({ error: 'No pudimos procesar la notificación' }, 500)
  }
}
