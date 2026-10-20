'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Send } from 'lucide-react'

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
type Datos = { pedido: string; nombre: string; email: string; motivo: string; web: string }
type Errores = Partial<Record<'pedido' | 'nombre' | 'email', string>>

/** Formulario del botón de arrepentimiento (Resolución 424/2020). Público: no hace falta tener cuenta. */
export function ArrepentimientoForm() {
  const [d, setD] = useState<Datos>({ pedido: '', nombre: '', email: '', motivo: '', web: '' })
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [tramite, setTramite] = useState<string | null>(null)

  const cambiar = (k: keyof Datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setD(p => ({ ...p, [k]: e.target.value })); setErrores(p => ({ ...p, [k]: undefined })) }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (enviando) return
    const x: Errores = {}
    if (d.pedido.trim().length < 3) x.pedido = 'Escribí el número de pedido (lo encontrás en el mail de tu compra).'
    if (d.nombre.trim().length < 2) x.nombre = 'Escribí tu nombre.'
    if (!EMAIL.test(d.email.trim())) x.email = 'Escribí un email válido.'
    setErrores(x)
    const primero = (['pedido', 'nombre', 'email'] as const).find(k => x[k])
    if (primero) { document.getElementById(`arr-${primero}`)?.focus(); return }
    setEnviando(true); setError(null)
    try {
      const r = await fetch('/api/arrepentimiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido: d.pedido, nombre: d.nombre, email: d.email, ...(d.motivo.trim() ? { motivo: d.motivo } : {}), web: d.web }) })
      const c = await r.json().catch(() => ({})) as { tramite?: string; error?: string }
      if (r.ok && c.tramite) setTramite(c.tramite)
      else setError(c.error || 'No pudimos registrar tu solicitud. Probá de nuevo o escribinos por email.')
    } catch {
      setError('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.')
    }
    setEnviando(false)
  }

  if (tramite) {
    return <div className="arr-ok" role="status">
      <CheckCircle2 size={28} aria-hidden="true" />
      <h2>Recibimos tu solicitud</h2>
      <p>Tu número de trámite es:</p>
      <p className="arr-tramite">{tramite}</p>
      <p>Te mandamos una constancia a <b>{d.email.trim().toLowerCase()}</b> y en breve te escribimos con las instrucciones de la devolución. Si no ves el mail, revisá la carpeta de spam. Guardá el número de trámite.</p>
      <p><Link href="/devoluciones">Ver cambios y devoluciones</Link></p>
    </div>
  }

  const campo = (k: 'pedido' | 'nombre' | 'email', etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    <label className={`checkout-field${errores[k] ? ' checkout-field--error' : ''}`}>
      <span>{etiqueta}</span>
      <input id={`arr-${k}`} value={d[k]} onChange={cambiar(k)} maxLength={k === 'email' ? 254 : 80} aria-invalid={!!errores[k]} aria-describedby={errores[k] ? `arr-${k}-e` : undefined} {...extra} />
      {errores[k] && <small id={`arr-${k}-e`} role="alert">{errores[k]}</small>}
    </label>

  return <form className="arr-form" onSubmit={enviar} noValidate>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {campo('pedido', 'Número de pedido', { autoComplete: 'off', inputMode: 'text' })}
    {campo('nombre', 'Nombre y apellido', { autoComplete: 'name' })}
    {campo('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
    <label className="checkout-field">
      <span>Motivo (opcional)</span>
      <textarea value={d.motivo} onChange={cambiar('motivo')} maxLength={1000} rows={4} />
    </label>
    {/* Campo trampa para bots: las personas no lo ven ni lo completan. */}
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>No completar<input tabIndex={-1} autoComplete="off" value={d.web} onChange={cambiar('web')} /></label>
    </div>
    <button type="submit" className="button button--dark" disabled={enviando}><Send size={16} aria-hidden="true" />{enviando ? 'Enviando…' : 'Quiero arrepentirme de mi compra'}</button>
  </form>
}
