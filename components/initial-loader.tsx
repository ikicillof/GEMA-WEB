'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { CargaGemmaCentro } from './carga-gemma'

export function InitialLoader() {
  const [visible, setVisible] = useState(true)
  const [opening, setOpening] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(false); return }
    try {
      if (window.sessionStorage.getItem('gemma-initial-loader')) { setVisible(false); return }
      window.sessionStorage.setItem('gemma-initial-loader', '1')
    } catch { /* Si storage está bloqueado, igual se oculta por tiempo. */ }
    // La pantalla de carga dura 2 s más que antes (1,1 s → 3,1 s hasta abrirse): a veces la puerta 3D del hero todavía
    // no había terminado de cargar cuando se iba.
    const openTimer = window.setTimeout(() => setOpening(true), 3100)
    const hideTimer = window.setTimeout(() => setVisible(false), 3500)
    return () => { window.clearTimeout(openTimer); window.clearTimeout(hideTimer) }
  }, [])
  if (!visible) return null
  return <div className={`initial-loader ${opening ? 'initial-loader--opening' : ''}`} aria-label="Cargando Gemma"><CargaGemmaCentro /><div className="initial-loader__leaf initial-loader__leaf--left" /><div className="initial-loader__leaf initial-loader__leaf--right" /></div>
}
