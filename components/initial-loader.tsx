'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { GemiSidekick } from './gemi-sidekick'

export function InitialLoader() {
  const [visible, setVisible] = useState(true)
  const [opening, setOpening] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(false); return }
    try {
      if (window.sessionStorage.getItem('gemma-initial-loader')) { setVisible(false); return }
      window.sessionStorage.setItem('gemma-initial-loader', '1')
    } catch { /* Si storage está bloqueado, igual se oculta por tiempo. */ }
    const openTimer = window.setTimeout(() => setOpening(true), 1100)
    const hideTimer = window.setTimeout(() => setVisible(false), 1500)
    return () => { window.clearTimeout(openTimer); window.clearTimeout(hideTimer) }
  }, [])
  if (!visible) return null
  return <div className={`initial-loader ${opening ? 'initial-loader--opening' : ''}`} aria-label="Cargando Gemma"><div className="initial-loader__center"><Image className="initial-loader__logo" src="/productos/logo-transparent.png" alt="Gemma" width={270} height={120} priority /><GemiSidekick tone="pink" /></div><span className="initial-loader__spark initial-loader__spark--one" /><span className="initial-loader__spark initial-loader__spark--two" /><div className="initial-loader__leaf initial-loader__leaf--left" /><div className="initial-loader__leaf initial-loader__leaf--right" /></div>
}
