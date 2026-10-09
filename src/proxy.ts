import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  try {
    const { url, anonKey } = getSupabaseEnv()
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    await supabase.auth.getUser()
  } catch (error) {
    // No dejar que una variable de entorno faltante o un corte de Supabase
    // tire 500 en TODO el sitio — las páginas públicas (home, catálogo)
    // deben seguir funcionando aunque el refresh de sesión falle.
    console.error('proxy: fallo al refrescar la sesión de Supabase', error)
  }

  return response
}

export const config = {
  // Excluye estáticos de Next, el webhook de Mercado Pago (no es una
  // sesión de usuario, agregar un round-trip a Supabase ahí solo suma
  // latencia/fallas) y el sitemap.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|sitemap.xml).*)'],
}
