'use client'

import { useState } from 'react'
import { useAuth } from './auth-provider'
import { CargaGemma } from './carga-gemma'

/**
 * Pregunta UNA sola vez, abajo de la pantalla, si quiere recibir novedades. Solo aparece cuando el servidor dice que a esta persona
 * (entró con Google sin tildar la casilla) todavía no se le preguntó. Responder sí o no lo guarda en su perfil y no vuelve a salir.
 * No bloquea nada: se puede seguir navegando con el aviso a la vista.
 */
export function AvisoNovedades() {
  const { sesion, preguntaNovedades, responderNovedades } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(false)
  if (!sesion || !preguntaNovedades) return null

  const responder = async (recibe: boolean) => {
    setError(false); setEnviando(true)
    try { await responderNovedades(recibe) } catch { setError(true) }
    setEnviando(false)
  }

  return <section className="novedades-aviso" aria-labelledby="novedades-aviso-titulo">
    <h2 id="novedades-aviso-titulo">¿Querés enterarte de las novedades de Gemma?</h2>
    <p>Te escribimos solo cuando hay algo lindo para contarte. Podés cambiarlo cuando quieras en «Mi cuenta».</p>
    {error && <p className="auth-error" role="alert">No pudimos guardar tu respuesta. Probá de nuevo.</p>}
    <div className="novedades-aviso-botones">
      <button type="button" className="button button--pink" disabled={enviando} onClick={() => responder(true)}>Sí, quiero</button>
      <button type="button" className="button button--secundario" disabled={enviando} onClick={() => responder(false)}>No, gracias</button>
    </div>
    <CargaGemma compacta activa={enviando} mensaje="Guardando tu respuesta…" />
  </section>
}
