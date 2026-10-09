import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  parseWebhookPayload,
  mapMercadoPagoStatusToOrderStatus,
} from '@/lib/mercadopago'
import type { OrdersRepository } from '@/lib/orders'
import { createSupabaseOrdersRepository } from '@/lib/orders/supabase-orders-repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function handleWebhookPayload(
  repo: OrdersRepository,
  raw: unknown
): Promise<{ ok: boolean }> {
  const parsed = parseWebhookPayload(raw)
  if (!parsed) return { ok: false }

  try {
    const status = mapMercadoPagoStatusToOrderStatus(parsed.mpStatus)
    // updateOrderPaymentStatus vuelve a escribir el mismo estado si el webhook
    // llega duplicado — no es una operación aditiva, así que es naturalmente
    // idempotente: aplicarla dos veces deja el pedido en el mismo estado.
    await repo.updateOrderPaymentStatus(parsed.orderId, status)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  const providedSecret = request.nextUrl.searchParams.get('secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const raw = await request.json()
  const supabase = await createSupabaseServerClient()
  const repo = createSupabaseOrdersRepository(supabase)
  const result = await handleWebhookPayload(repo, raw)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
