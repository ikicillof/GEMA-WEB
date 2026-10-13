'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getTunnelAtlas } from '@/lib/tunnel-assets'

// El código del túnel ya se precargó en segundo plano (lib/tunnel-assets), así que acá carga al instante.
const TunnelScene = dynamic(() => import('./tunnel-scene'), { ssr: false })

const FADE_MS = 380 // la luz se funde con el catálogo (que ya está cargado detrás)

/** Viaje por el túnel al entrar a /tienda. Un clic, un toque o cualquier tecla lo saltea. */
export function TunnelOverlay({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)
  const finished = useRef(false)
  const atlas = getTunnelAtlas()
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setFading(true)
    window.setTimeout(onDone, FADE_MS)
  }, [onDone])

  useEffect(() => {
    // Gemi fijo no aparece durante el viaje (vuelve solo cuando se saca la clase).
    document.documentElement.classList.add('tunnel-active')
    const skip = () => finish()
    window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip)
    return () => { document.documentElement.classList.remove('tunnel-active'); window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip) }
  }, [finish])

  if (!atlas) return null
  // Al terminar, el padre desmonta todo: el canvas se destruye y R3F libera el contexto WebGL y la memoria de la GPU.
  return <div className={`tunnel-overlay ${fading ? 'tunnel-overlay--fade' : ''}`} aria-hidden="true">
    <TunnelScene atlas={atlas.canvas} tiles={atlas.tiles} narrow={narrow} duration={narrow ? 3 : 3.2} onEnd={finish} />
  </div>
}
