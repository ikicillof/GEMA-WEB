'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getTunnelAtlas, preloadTunnel } from '@/lib/tunnel-assets'
import { TunnelOverlay } from './tunnel-overlay'
import type { TunnelVersion } from './tunnel-overlay'

// El túnel circular es la transición entre TODAS las páginas. Dos versiones:
// · completa (con fotos de productos): solo la primera vez por visita que se entra a la tienda, en escritorio;
// · rápida (≈ 1 s, sin fotos y con menos discos): todos los demás cambios de página (y siempre en celular).
// No hay túnel al entrar directo a una página (dirección escrita o recarga), ni con links a una sección de la misma página
// (siguen haciendo scroll suave), ni con movimiento reducido (cambio de página directo).
// (el sitio usa trailingSlash: la ruta puede venir como "/tienda/")
const norm = (path: string) => path.replace(/\/+$/, '') || '/'
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function PageTransition() {
  const pathname = usePathname()
  const router = useRouter()
  const [trip, setTrip] = useState<{ key: number; version: TunnelVersion } | null>(null)
  const tripRef = useRef(trip); tripRef.current = trip
  const lastPath = useRef(norm(pathname))
  const pendingTo = useRef<string | null>(null) // destino de un clic: el viaje ya arrancó, el cambio de ruta no lo reinicia
  const storeSeen = useRef(false) // la versión completa se muestra una sola vez por visita
  const tripKey = useRef(0)

  // Precarga en segundo plano (cuando el navegador está libre): el código del túnel y, en escritorio, el atlas de fotos.
  useEffect(() => {
    if (prefersReduced()) return
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const run = () => { void preloadTunnel() }
    if (idle) idle(run); else window.setTimeout(run, 1500)
  }, [])

  const startTrip = (to: string) => {
    if (tripRef.current) return
    const narrow = window.matchMedia('(max-width: 700px)').matches
    const full = to === '/tienda' && !storeSeen.current && !narrow && !!getTunnelAtlas()
    if (full) storeSeen.current = true
    setTrip({ key: ++tripKey.current, version: full ? 'full' : 'quick' })
  }

  // Clic en un link interno que cambia de página: el viaje empieza al instante y la página nueva se carga mientras dura.
  useEffect(() => {
    if (prefersReduced()) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest('a')
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = norm(url.pathname)
      if (to === norm(window.location.pathname)) return // misma página (anclas): scroll suave como siempre
      if (tripRef.current) return // ya hay un viaje en curso: navegación normal por debajo
      e.preventDefault()
      pendingTo.current = to
      startTrip(to)
      router.push(url.pathname + url.search + url.hash)
    }
    // En captura: se adelanta al manejador de next/link, que respeta el preventDefault y no navega dos veces.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Cambio de ruta que no vino de un clic (los botones atrás/adelante del navegador): viaje rápido.
  useEffect(() => {
    const now = norm(pathname), prev = lastPath.current
    lastPath.current = now
    if (now === prev) return
    if (pendingTo.current === now) { pendingTo.current = null; return }
    if (prefersReduced()) return
    startTrip(now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (!trip) return null
  return <TunnelOverlay key={trip.key} version={trip.version} onDone={() => setTrip(null)} />
}
