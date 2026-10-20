'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { r3fListo } from '@/lib/safe-invalidate'

/**
 * Carga una escena 3D recién cuando se monta en el navegador. A diferencia de `next/dynamic`, el archivo NO se agrega al HTML inicial
 * como <script>: three.js (~680 KB) se descarga después de que la página ya se pueda leer y usar. Mientras tanto no dibuja nada;
 * si la descarga falla, tampoco: el resto de la página sigue funcionando (los textos no dependen del 3D).
 */
export function cargaDiferida<P extends object>(cargar: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  return function EscenaDiferida(props: P) {
    const [Escena, setEscena] = useState<ComponentType<P> | null>(null)
    useEffect(() => {
      let vivo = true
      cargar().then(m => { r3fListo(); if (vivo) setEscena(() => m.default) }).catch(e => console.error('[3D] no se pudo descargar la escena:', (e as Error).message))
      return () => { vivo = false }
    }, [])
    return Escena ? <Escena {...props} /> : null
  }
}
