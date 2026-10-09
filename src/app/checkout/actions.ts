'use server'

import { createOrderFromCart, createInMemoryOrdersRepository } from '@/lib/orders'
import { buildPreferencePayload, createPreference } from '@/lib/mercadopago'
import type { OrderInput } from '@/types/order'

export async function confirmMercadoPagoOrder(
  input: OrderInput
): Promise<{ initPoint: string }> {
  // createInMemoryOrdersRepository se reemplaza por createSupabaseOrdersRepository
  // (Tarea 16) una vez que el proyecto Supabase real esté configurado; la
  // composición (crear pedido -> armar preferencia -> pedir el init_point) es
  // la misma con cualquiera de los dos repositorios, porque ambos implementan
  // OrdersRepository.
  const repo = createInMemoryOrdersRepository()
  const order = await createOrderFromCart(repo, input)
  const payload = buildPreferencePayload(order)
  const { init_point } = await createPreference(
    payload,
    process.env.MERCADOPAGO_ACCESS_TOKEN!
  )
  return { initPoint: init_point }
}
