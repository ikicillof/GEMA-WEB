'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTunnelAtlas, preloadTunnel } from '@/lib/tunnel-assets'
import { TunnelOverlay } from './tunnel-overlay'

export function PageTransition() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [tunnel, setTunnel] = useState(false)
  const firstRender = useRef(true)

  // Precarga en segundo plano (cuando el navegador está libre): atlas de fotos y código del túnel. Sin túnel con
  // movimiento reducido.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const run = () => { void preloadTunnel() }
    if (idle) idle(run); else window.setTimeout(run, 1500)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // (el sitio usa trailingSlash: la ruta puede venir como "/tienda/")
    const isStore = pathname.replace(/\/$/, '') === '/tienda'
    if (firstRender.current) {
      firstRender.current = false
      // Entrada directa a /tienda (dirección escrita o recarga): también hay túnel, una vez que el atlas está listo y
      // la pantalla de carga inicial ya se fue. Cualquier otra página entra sin transición.
      if (!isStore) return
      let cancelled = false
      void preloadTunnel().then(async () => {
        for (let i = 0; i < 80 && document.querySelector('.initial-loader'); i++) await new Promise(r => window.setTimeout(r, 100))
        if (!cancelled && getTunnelAtlas()) setTunnel(true)
      })
      return () => { cancelled = true }
    }
    // Siempre que se navega a /tienda: túnel (reemplaza a la puerta) si ya está todo precargado; si no, la puerta de siempre.
    if (isStore && getTunnelAtlas()) { setActive(false); setTunnel(true); return }
    setActive(true); setOpen(false)
    const openTimer = window.setTimeout(() => setOpen(true), 40)
    const closeTimer = window.setTimeout(() => setActive(false), 760)
    return () => { window.clearTimeout(openTimer); window.clearTimeout(closeTimer) }
  }, [pathname])
  if (tunnel) return <TunnelOverlay onDone={() => setTunnel(false)} />
  if (!active) return null
  return <div className={`page-transition ${open ? 'page-transition--open' : ''}`} aria-hidden="true"><div className="page-transition__light" /><div className="page-transition__leaf page-transition__leaf--left" /><div className="page-transition__leaf page-transition__leaf--right" /></div>
}
