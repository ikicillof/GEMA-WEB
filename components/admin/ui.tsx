'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

/** Aviso dentro de una página del panel. `error` y `ok` se anuncian a los lectores de pantalla. */
export function Aviso({ tipo = 'aviso', children }: { tipo?: 'aviso' | 'error' | 'ok' | 'info'; children: React.ReactNode }) {
  const Icono = tipo === 'ok' ? CheckCircle2 : tipo === 'info' ? Info : AlertTriangle
  return <div className={`adm-aviso${tipo === 'aviso' ? '' : ` adm-aviso--${tipo}`}`} role={tipo === 'error' ? 'alert' : 'status'}>
    <Icono size={18} aria-hidden="true" /><div className="adm-aviso-cuerpo">{children}</div>
  </div>
}

/**
 * Confirmación propia (en vez de confirm() del navegador, que en el celular se ve mal y se puede bloquear).
 * Enfoca "Cancelar" al abrir, se cierra con Esc y devuelve el foco al botón que la abrió.
 */
export function Confirmar({ titulo, texto, confirmar, peligro = false, ocupado = false, onConfirmar, onCancelar, children }: {
  titulo: string
  texto?: string
  confirmar: string
  peligro?: boolean
  ocupado?: boolean
  onConfirmar: () => void
  onCancelar: () => void
  children?: React.ReactNode
}) {
  const cancelar = useRef<HTMLButtonElement>(null)
  const previo = useRef<Element | null>(null)
  useEffect(() => {
    previo.current = document.activeElement
    cancelar.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !ocupado) onCancelar() }
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('keydown', esc); (previo.current as HTMLElement | null)?.focus?.() }
  }, [onCancelar, ocupado])
  return <div className="adm-modal" onMouseDown={e => { if (e.target === e.currentTarget && !ocupado) onCancelar() }}>
    <div className="adm-modal-caja" role="dialog" aria-modal="true" aria-labelledby="adm-modal-titulo">
      <h2 id="adm-modal-titulo">{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
      <div className="adm-actions">
        <button type="button" ref={cancelar} className="button adm-btn adm-btn--ghost" onClick={onCancelar} disabled={ocupado}>Cancelar</button>
        <button type="button" className={`button adm-btn ${peligro ? 'adm-btn--danger' : 'button--pink'}`} onClick={onConfirmar} disabled={ocupado}>{ocupado ? 'Un momento…' : confirmar}</button>
      </div>
    </div>
  </div>
}

export const fechaHora = (iso: string | null) => iso
  ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  : '—'
