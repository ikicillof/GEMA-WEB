import type { OrdersRepository } from '@/lib/orders'
import { createSupabaseOrdersRepository } from './supabase-orders-repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { devOrdersRepository } from './dev-orders-store'

// Única fuente de verdad sobre qué repositorio de pedidos usar — tanto el
// checkout (Server Actions) como el webhook de Mercado Pago llaman a esta
// misma función, para que nunca puedan divergir en qué backing store usan.
// Cuando haya un proyecto Supabase real configurado, ambos usan Supabase;
// mientras no lo haya, ambos comparten el mismo singleton en memoria.
export async function getOrdersRepository(): Promise<OrdersRepository> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const client = await createSupabaseServerClient()
    return createSupabaseOrdersRepository(client)
  }
  return devOrdersRepository
}
