import type { OrdersRepository } from '@/lib/orders'
import { createSupabaseOrdersRepository } from './supabase-orders-repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role'
import { devOrdersRepository } from './dev-orders-store'

// Única fuente de verdad sobre qué repositorio de pedidos usar — tanto el
// checkout (Server Actions) como el webhook de Mercado Pago llaman a esta
// misma función, para que nunca puedan divergir en qué backing store usan.
// Cuando haya un proyecto Supabase real configurado, ambos usan Supabase;
// mientras no lo haya, ambos comparten el mismo singleton en memoria.
//
// El parámetro `role` solo decide CON QUÉ PRIVILEGIO se accede a ese mismo
// backing store: 'user' (default) usa el cliente cookie-scoped de la sesión
// del usuario logueado — correcto para el checkout, donde las políticas RLS
// atadas a auth.uid() deben aplicarse. 'service' usa el cliente service-role
// — correcto para el webhook, que es un llamador servidor-a-servidor sin
// sesión de usuario detrás (ver C3): no hay cookies que pasar, y forzarlo a
// pasar por el cliente anónimo dejaría la escritura bloqueada por RLS o,
// peor, dependiente de que RLS permita escrituras anónimas.
export async function getOrdersRepository(
  options?: { role?: 'user' | 'service' }
): Promise<OrdersRepository> {
  const role = options?.role ?? 'user'
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const client =
      role === 'service' ? createSupabaseServiceRoleClient() : await createSupabaseServerClient()
    return createSupabaseOrdersRepository(client)
  }
  return devOrdersRepository
}
