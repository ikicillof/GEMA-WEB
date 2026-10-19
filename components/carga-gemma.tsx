'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { GemiSidekick } from './gemi-sidekick'

const RETRASO_MS = 300 // una espera más corta que esto no se muestra
const MINIMO_MS = 500 // una vez que aparece, se queda al menos esto (evita el destello)

/** Decide cuándo se ve la pantalla de carga: no antes de 300 ms de espera y, ya visible, no menos de 500 ms. */
export function useEsperaSuave(activa: boolean) {
  const [visible, setVisible] = useState(false)
  const desde = useRef(0)
  useEffect(() => {
    if (activa) {
      if (visible) return
      const t = setTimeout(() => { desde.current = Date.now(); setVisible(true) }, RETRASO_MS)
      return () => clearTimeout(t)
    }
    if (!visible) return
    const t = setTimeout(() => setVisible(false), Math.max(0, MINIMO_MS - (Date.now() - desde.current)))
    return () => clearTimeout(t)
  }, [activa, visible])
  return visible
}

/** Logo con Gemi girando y las estrellitas titilando (el centro de la pantalla de carga del home). */
export function CargaGemmaCentro({ mensaje }: { mensaje?: string }) {
  return <div className="carga-gemma__escena">
    <div className="carga-gemma__centro">
      <Image className="carga-gemma__logo" src="/productos/logo-transparent.png" alt="" width={270} height={120} priority />
      <GemiSidekick tone="pink" />
      {mensaje && <p className="carga-gemma__mensaje" role="status" aria-live="polite">{mensaje}</p>}
    </div>
    <span className="carga-gemma__spark carga-gemma__spark--one" aria-hidden="true" />
    <span className="carga-gemma__spark carga-gemma__spark--two" aria-hidden="true" />
  </div>
}

/**
 * Pantalla de carga de la marca para cualquier espera.
 * - Sin `compacta`: a pantalla completa sobre fondo crema (y bloquea los toques mientras dura).
 * - Con `compacta`: dentro de la sección donde está, para esperas chicas.
 * - `activa` (por defecto true): se puede dejar montada y prender/apagar, así se respetan los 300 ms de retraso y los 500 ms mínimos.
 */
export function CargaGemma({ mensaje, activa = true, compacta = false }: { mensaje: string; activa?: boolean; compacta?: boolean }) {
  const visible = useEsperaSuave(activa)
  if (!visible) return null
  return <div className={`carga-gemma ${compacta ? 'carga-gemma--compacta' : 'carga-gemma--pantalla'}`} aria-busy="true">
    <CargaGemmaCentro mensaje={mensaje} />
  </div>
}
