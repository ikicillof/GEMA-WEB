import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  parseWebhookPayload,
  mapMercadoPagoStatusToOrderStatus,
} from '@/lib/mercadopago'
import type { OrdersRepository } from '@/lib/orders'
import { getOrdersRepository } from '@/lib/orders/get-orders-repository'

// El llamador es responsable de verificar la autenticidad del request
// (el chequeo de secreto compartido en POST) antes de invocar esto —
// esta función no hace ningún chequeo de autenticación por sí misma.
export async function handleWebhookPayload(
  repo: OrdersRepository,
  raw: unknown
): Promise<{ ok: boolean }> {
  const parsed = parseWebhookPayload(raw)
  if (!parsed) return { ok: false }

  try {
    const current = await repo.getOrder(parsed.orderId)
    if (!current) return { ok: false }

    const status = mapMercadoPagoStatusToOrderStatus(parsed.mpStatus)
    if (current.paymentStatus === 'pagado' && status !== 'pagado') {
      // Pedido ya pagado: ignoramos una notificación tardía/fuera de orden
      // que intentaría retrocederlo (ej. un "pending" que llega después del
      // "approved" ya procesado). Devolvemos ok:true porque la notificación
      // fue recibida y procesada correctamente — solo decidimos no aplicarla.
      return { ok: true }
    }

    await repo.updateOrderPaymentStatus(parsed.orderId, status)
    return { ok: true }
  } catch (error) {
    console.error('handleWebhookPayload failed:', error)
    return { ok: false }
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  const providedSecret = request.nextUrl.searchParams.get('secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const repo = await getOrdersRepository({ role: 'service' })
  const result = await handleWebhookPayload(repo, raw)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
