import { NextResponse, type NextRequest } from 'next/server'

// SEO: un solo dominio en los buscadores. El dominio principal en Netlify es gemma-oficial.com.ar (sin www).
const CANONICO = 'gemma-oficial.com.ar'
const PRIVADAS = ['/admin', '/checkout', '/mis-compras', '/mi-cuenta', '/baja', '/auth']

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '')

  // www -> sin www (una sola versión canónica).
  if (host === `www.${CANONICO}`) {
    const destino = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICO}`)
    return NextResponse.redirect(destino, 301)
  }

  const res = NextResponse.next()
  // Cualquier otro host (*.netlify.app, localhost) no se indexa. Las páginas privadas tampoco, en ningún host.
  const privada = PRIVADAS.some(p => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`))
  if (host !== CANONICO || privada) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] }
