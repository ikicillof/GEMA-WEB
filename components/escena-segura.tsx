'use client'

import { Component, type ReactNode } from 'react'

/**
 * Envuelve una escena 3D. Si el 3D falla (sin WebGL, error al cargar el modelo o el chunk), la escena desaparece y el resto de la página
 * sigue: los textos, títulos y la ilustración de Gemi son HTML normal y quedan visibles. Sin esto, un error del canvas rompería toda la página.
 */
export class EscenaSegura extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  componentDidCatch(error: Error) { console.error('[3D] la escena no se pudo mostrar:', error.message) }
  render() { return this.state.fallo ? null : this.props.children }
}
