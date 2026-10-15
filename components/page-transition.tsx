'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTunnelAtlas, preloadTunnel } from '@/lib/tunnel-assets'
import { pageOrigin } from '@/lib/page-origin'
import { TunnelOverlay } from './tunnel-overlay'
import type { TunnelVersion } from './tunnel-overlay'

// Entre páginas va la puerta que se abre (rosa Gemma). El túnel circular se muestra SOLO al pasar de la 404 a la tienda
// (la 404 marca `pageOrigin.from404` justo antes de navegar). Al entrar directo a una página (dirección escrita o recarga)
// no hay transición, y con movimiento reducido el cambio de página es directo.
export function PageTransition() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [tunnel, setTunnel] = useState<TunnelVersion | null>(null)
  const firstRender = useRef(true)

  // Precarga en segundo plano (cuando el navegador está libre): el código del túnel y, en escritorio, el atlas de fotos.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const run = () => { void preloadTunnel() }
    if (idle) idle(run); else window.setTimeout(run, 1500)
  }, [])

  useEffect(() => {
    const from404 = pageOrigin.from404; pageOrigin.from404 = false // el aviso vale para un solo cambio de página
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (firstRender.current) { firstRender.current = false; return } // entrada directa: sin transición
    // (el sitio usa trailingSlash: la ruta puede venir como "/tienda/")
    const isStore = pathname.replace(/\/$/, '') === '/tienda'
    if (isStore && from404) {
      // Versión completa (con fotos de productos) si el atlas ya está listo y no es celular; si no, la rápida.
      const full = !!getTunnelAtlas() && !window.matchMedia('(max-width: 700px)').matches
      setActive(false); setTunnel(full ? 'full' : 'quick'); return
    }
    setActive(true); setOpen(false)
    const openTimer = window.setTimeout(() => setOpen(true), 40)
    const closeTimer = window.setTimeout(() => setActive(false), 760)
    return () => { window.clearTimeout(openTimer); window.clearTimeout(closeTimer) }
  }, [pathname])
  if (tunnel) return <TunnelOverlay version={tunnel} onDone={() => setTunnel(null)} />
  if (!active) return null
  return <div className={`page-transition ${open ? 'page-transition--open' : ''}`} aria-hidden="true"><div className="page-transition__light" /><div className="page-transition__leaf page-transition__leaf--left" /><div className="page-transition__leaf page-transition__leaf--right" /></div>
}
