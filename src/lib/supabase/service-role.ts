import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'

// Cliente con privilegios elevados para llamadores de servidor-a-servidor
// sin sesión de usuario (el webhook de Mercado Pago, por ejemplo) — a
// diferencia de createSupabaseServerClient (createServerClient + cookies),
// este NO usa cookies ni está limitado por RLS atado a auth.uid(), porque
// no hay ningún usuario logueado detrás de esta llamada.
export function createSupabaseServiceRoleClient() {
  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey)
}
