'use client'

import { cargaDiferida } from './carga-diferida'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getTunnelAtlas } from '@/lib/tunnel-assets'
import type { ExitTint } from './tunnel-scene'

// El código del túnel ya se precargó en segundo plano (lib/tunnel-assets), así que acá carga al instante.
const TunnelScene = cargaDiferida(() => import('./tunnel-scene'))

export type TunnelVersion = 'full' | 'quick'
// Completa (con fotos de productos): 1,8 s; rápida (sin fotos y con menos discos): 1 s. Después, la luz se funde con la página.
const DURATION: Record<TunnelVersion, number> = { full: 1.8, quick: 1.0 }
const FADE_MS: Record<TunnelVersion, number> = { full: 380, quick: 260 }
const CREAM: ExitTint = { rgb: [1, 0.976, 0.961], warm: 1 }

/** Color de fondo de la página de destino (la que se carga mientras dura el viaje): se lee del elemento que queda en el centro de
 *  la pantalla, subiendo hasta encontrar un fondo opaco. Si el fondo es un degradado (el home y las páginas claras), es el crema. */
function destinationTint(): ExitTint {
  for (const el of document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)) {
    if (el.closest('.tunnel-overlay, .site-header, .gemi-global, .cursor-trail')) continue
    let node: Element | null = el
    while (node && node !== document.documentElement) {
      const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)
      node = node.parentElement
      if (!m || m.length < 3) continue
      const [r, g, b, a = 1] = m.map(Number)
      if (a < 0.9) continue
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return { rgb: [r / 255, g / 255, b / 255], warm: lum > 0.6 ? 1 : 0 }
    }
    break
  }
  return CREAM
}

/** Viaje por el túnel entre páginas. Un clic, un toque o cualquier tecla lo saltea. */
export function TunnelOverlay({ version, onDone }: { version: TunnelVersion; onDone: () => void }) {
  const quick = version === 'quick'
  const [fading, setFading] = useState(false)
  const finished = useRef(false)
  const atlas = quick ? null : getTunnelAtlas()
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
  const exit = useRef<ExitTint>(CREAM)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setFading(true)
    window.setTimeout(onDone, FADE_MS[version])
  }, [onDone, version])

  useEffect(() => {
    // Gemi fijo no aparece durante el viaje (vuelve solo cuando se saca la clase, ya con el color de la página nueva).
    document.documentElement.classList.add('tunnel-active')
    const skip = () => finish()
    window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip)
    // El círculo de luz de la salida toma el fondo de la página de destino; se vuelve a medir mientras ésta termina de cargarse.
    const measure = () => { exit.current = destinationTint() }
    const interval = window.setInterval(measure, 120)
    const safety = window.setTimeout(finish, DURATION[version] * 1000 + 3500) // por si WebGL no arranca: nunca queda trabado
    return () => { document.documentElement.classList.remove('tunnel-active'); window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip); window.clearInterval(interval); window.clearTimeout(safety) }
  }, [finish, version])

  // Al terminar, el padre desmonta todo: el canvas se destruye y R3F libera el contexto WebGL y la memoria de la GPU.
  return <div className={`tunnel-overlay ${fading ? 'tunnel-overlay--fade' : ''}`} style={{ transitionDuration: `${FADE_MS[version]}ms` }} aria-hidden="true">
    <TunnelScene atlas={atlas?.canvas ?? null} tiles={atlas?.tiles ?? 0} narrow={narrow} quick={quick} duration={DURATION[version]} exit={exit} onEnd={finish} />
  </div>
}
