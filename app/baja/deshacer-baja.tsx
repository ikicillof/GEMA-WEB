'use client'

import { useState } from 'react'
import { CargaGemma } from '@/components/carga-gemma'

/** «Me equivoqué»: vuelve a activar las novedades con el mismo token del mail (sin login). */
export function DeshacerBaja({ token }: { token: string }) {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'hecho' | 'error'>('inicial')

  async function volver() {
    setEstado('enviando')
    try {
      const r = await fetch('/api/novedades/baja', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, accion: 'alta' }) })
      setEstado(r.ok ? 'hecho' : 'error')
    } catch { setEstado('error') }
  }

  if (estado === 'hecho') return <p className="auth-ok" role="status">Listo, volviste a la lista de novedades.</p>
  return <>
    <button type="button" className="button button--secundario" onClick={volver} disabled={estado === 'enviando'}>Me equivoqué, quiero volver a recibirlas</button>
    {estado === 'error' && <p className="auth-error" role="alert">No pudimos hacerlo. Probá de nuevo.</p>}
    <CargaGemma compacta activa={estado === 'enviando'} mensaje="Guardando…" />
  </>
}
