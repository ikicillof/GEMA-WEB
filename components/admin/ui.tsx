'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { EstadoPedido } from '@/lib/pedidos'

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
  // onCancelar y ocupado van por ref: si fueran dependencias del efecto, cada letra escrita en un campo del diálogo (que re-renderiza
  // la pantalla y crea otra onCancelar) lo volvería a ejecutar y el foco saltaba de la casilla al botón «Cancelar».
  const vivo = useRef({ onCancelar, ocupado })
  vivo.current = { onCancelar, ocupado }
  useEffect(() => {
    previo.current = document.activeElement
    // Si el diálogo trae un campo para escribir, el foco va ahí; si no, al botón «Cancelar» (la opción segura).
    const campo = document.querySelector<HTMLElement>('.adm-modal-caja textarea, .adm-modal-caja input:not([type="hidden"])')
    ;(campo ?? cancelar.current)?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !vivo.current.ocupado) vivo.current.onCancelar() }
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('keydown', esc); (previo.current as HTMLElement | null)?.focus?.() }
  }, [])
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

/** Color de la etiqueta de cada estado de venta. */
export const claseEstado = (e: EstadoPedido) =>
  e === 'pagado' ? 'adm-chip--ok' : e === 'completado' ? 'adm-chip--listo' : e === 'cancelado' ? 'adm-chip--malo' : 'adm-chip--espera'
export const textoMetodo = (m: string) => (m === 'transferencia' ? 'Transferencia' : 'Mercado Pago')

export const fechaHora = (iso: string | null) => iso
  ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  : '—'
