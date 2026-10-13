'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const firstRender = useRef(true)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (firstRender.current) { firstRender.current = false; return }
    setActive(true); setOpen(false)
    const openTimer = window.setTimeout(() => setOpen(true), 40)
    const closeTimer = window.setTimeout(() => setActive(false), 760)
    return () => { window.clearTimeout(openTimer); window.clearTimeout(closeTimer) }
  }, [pathname])
  if (!active) return null
  return <div className={`page-transition ${open ? 'page-transition--open' : ''}`} aria-hidden="true"><div className="page-transition__light" /><div className="page-transition__leaf page-transition__leaf--left" /><div className="page-transition__leaf page-transition__leaf--right" /></div>
}
