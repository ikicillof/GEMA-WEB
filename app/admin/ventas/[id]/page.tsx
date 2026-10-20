'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Mail, XCircle } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Aviso, Confirmar, claseEstado, fechaHora, textoMetodo } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import { ESTADO_TEXTO, type EstadoPedido } from '@/lib/pedidos'
import { formatPrice } from '@/lib/products'
import type { aDetalle } from '@/lib/server/ventas-admin'

type Detalle = ReturnType<typeof aDetalle>
const MAILS: Record<string, string> = {
  nueva_venta_duena: 'Aviso a la dueña',
  confirmacion_cliente: 'Confirmación al cliente',
  transferencia_completada: 'Transferencia completada',
}

function Fila({ k, v }: { k: string; v: React.ReactNode }) { return <div><dt>{k}</dt><dd>{v}</dd></div> }

function Venta() {
  const { id } = useParams<{ id: string }>()
  const { api, puede, avisar } = useAdmin()
  const [v, setV] = useState<Detalle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<'completar' | 'cancelar' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [reintentando, setReintentando] = useState(false)

  const cargar = useCallback(async () => {
    const r = await api<{ venta: Detalle }>(`/api/admin/ventas/${encodeURIComponent(id)}`)
    if (r.ok) { setV(r.cuerpo.venta); setError(null) } else setError(r.cuerpo.error || 'No pudimos cargar la venta.')
  }, [api, id])
  useEffect(() => { void cargar() }, [cargar])

  const esAdmin = puede('admin')
  const puedeCompletar = esAdmin && v?.metodoPago === 'transferencia' && v.estado === 'transferencia_en_proceso'
  const puedeCancelar = esAdmin && (v?.estado === 'pendiente_pago' || v?.estado === 'transferencia_en_proceso')
  const mailsConError = v ? Object.entries(v.mails).filter(([, m]) => m.estado === 'error') : []

  function cerrarDialogo() { if (ocupado) return; setDialogo(null); setMotivo(''); setErrorMotivo(null) }

  async function completar() {
    setOcupado(true)
    const r = await api(`/api/admin/pedidos/${encodeURIComponent(id)}/completar`, { method: 'POST', body: '{}' })
    setOcupado(false)
    setDialogo(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos completar la venta.', true); return }
    avisar('Venta completada. El cliente recibe el mail.')
    await cargar()
  }

  async function cancelar() {
    if (motivo.trim().length < 3) { setErrorMotivo('Escribí el motivo (mínimo 3 letras).'); return }
    setOcupado(true)
    const r = await api(`/api/admin/ventas/${encodeURIComponent(id)}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) })
    setOcupado(false)
    if (!r.ok) { setErrorMotivo(r.cuerpo.error || 'No pudimos cancelar la venta.'); return }
    setDialogo(null); setMotivo(''); setErrorMotivo(null)
    avisar('Venta cancelada.')
    await cargar()
  }

  async function reintentar() {
    setReintentando(true)
    const r = await api<{ reintentados: number; siguenFallando: number }>('/api/admin/mails/reintentar', { method: 'POST', body: JSON.stringify({ id }) })
    setReintentando(false)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos reintentar los mails.', true); return }
    avisar(r.cuerpo.siguenFallando ? 'Algún mail sigue fallando. Revisá el detalle del error.' : 'Mails enviados.', r.cuerpo.siguenFallando > 0)
    await cargar()
  }

  const volver = <Link href="/admin/ventas" className="adm-volver"><ArrowLeft size={16} aria-hidden="true" />Todas las ventas</Link>

  if (error) return <>{volver}<div className="adm-card"><Aviso tipo="error">{error}</Aviso></div></>
  if (!v) return <>{volver}<CargaGemma mensaje="Abriendo la venta…" compacta /></>

  const e = v.entrega
  return <>
    {volver}
    <div className="adm-head">
      <div>
        <p className="eyebrow">Venta</p>
        <h1 className="adm-title" style={{ fontSize: 'clamp(22px,5vw,34px)', overflowWrap: 'anywhere' }}>N.º {v.id}</h1>
        <p className="adm-sub">{fechaHora(v.creadoEn)}</p>
      </div>
      <div className="adm-fila-meta">
        <span className={`adm-chip ${claseEstado(v.estado)}`}>{ESTADO_TEXTO[v.estado as EstadoPedido]}</span>
        <span className="adm-chip">{textoMetodo(v.metodoPago)}</span>
        {v.modoPrueba && <span className="adm-chip adm-chip--prueba">Prueba</span>}
      </div>
    </div>

    {v.requiereRevision && <Aviso tipo="error">
      <b>Esta venta pide revisión.</b> El pago llegó con un monto distinto, o hubo una devolución o un contracargo, o se pagó una venta que estaba cancelada.
      Mirá el pago{v.pagoId ? ` ${v.pagoId}` : ''}{v.mpStatus ? ` (estado en Mercado Pago: ${v.mpStatus})` : ''} en Mercado Pago antes de despachar.
    </Aviso>}
    {v.modoPrueba && <Aviso tipo="info">Venta de prueba (se hizo con credenciales de prueba). No es una compra real.</Aviso>}
    {v.mailsPendientes && <Aviso>
      <b>Hay mails de esta venta sin enviar.</b>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{mailsConError.map(([tipo, m]) => <li key={tipo}>{MAILS[tipo] ?? tipo}: {m.error || 'error'} ({m.intentos} {m.intentos === 1 ? 'intento' : 'intentos'})</li>)}</ul>
      {esAdmin && <button type="button" className="button button--pink adm-btn" onClick={reintentar} disabled={reintentando}><Mail size={16} aria-hidden="true" />{reintentando ? 'Reintentando…' : 'Reintentar el envío de mails'}</button>}
    </Aviso>}
    {v.estado === 'cancelado' && v.motivoCancelacion && <Aviso tipo="info"><b>Motivo de la cancelación:</b> {v.motivoCancelacion}</Aviso>}

    {(puedeCompletar || puedeCancelar) && <div className="adm-card">
      <h2>Acciones</h2>
      <div className="adm-actions">
        {puedeCompletar && <button type="button" className="button button--pink adm-btn" onClick={() => setDialogo('completar')}><CheckCircle2 size={16} aria-hidden="true" />Marcar como completada</button>}
        {puedeCancelar && <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => setDialogo('cancelar')}><XCircle size={16} aria-hidden="true" />Cancelar la venta</button>}
      </div>
    </div>}

    <div className="adm-card">
      <h2>Productos</h2>
      {v.lineas.map((l: { id: string; name: string; color: string; quantity: number; price: number }) =>
        <div className="adm-linea" key={`${l.id}-${l.color}`}>
          <span>{l.quantity} × {l.name}{l.color ? ` · ${l.color}` : ''}</span><b>{formatPrice(l.price * l.quantity)}</b>
        </div>)}
      <dl className="adm-dl" style={{ marginTop: 10 }}>
        <Fila k="Subtotal" v={formatPrice(v.subtotal)} />
        {v.descuento > 0 && <Fila k="Descuento por transferencia" v={`− ${formatPrice(v.descuento)}`} />}
        <Fila k={`Envío${v.envio?.servicio ? ` (${v.envio.servicio})` : ''}`} v={v.envio ? formatPrice(v.envio.precio) : 'Sin envío'} />
      </dl>
      <div className="adm-total"><span>Total</span><span>{formatPrice(v.total)}</span></div>
      {v.cotizacionSimulada && <p className="adm-sub">El costo de envío es una cotización simulada, no la real del correo.</p>}
    </div>

    <div className="adm-card">
      <h2>Cliente y envío</h2>
      <dl className="adm-dl">
        <Fila k="Nombre" v={v.contacto.nombre || '—'} />
        <Fila k="DNI" v={v.contacto.dni || '—'} />
        <Fila k="Teléfono" v={v.contacto.telefono ? <a href={`tel:${v.contacto.telefono}`}>{v.contacto.telefono}</a> : '—'} />
        <Fila k="Email" v={v.contacto.email ? <a href={`mailto:${v.contacto.email}`}>{v.contacto.email}</a> : '—'} />
      </dl>
      <h3>Entrega</h3>
      <dl className="adm-dl">
        <Fila k="Modalidad" v={v.envio ? (v.envio.modalidad === 'sucursal' ? 'Retiro en sucursal' : 'A domicilio') : '—'} />
        {v.envio?.sucursal && <Fila k="Sucursal" v={`${v.envio.sucursal.nombre} — ${v.envio.sucursal.direccion}, ${v.envio.sucursal.localidad}`} />}
        <Fila k="Dirección" v={[`${e.calle} ${e.numero}`.trim(), e.piso].filter(Boolean).join(', ') || '—'} />
        <Fila k="Localidad" v={[e.localidad, e.provincia].filter(Boolean).join(', ') || '—'} />
        <Fila k="Código postal" v={e.cp || '—'} />
      </dl>
    </div>

    <div className="adm-card">
      <h2>Historial de estados</h2>
      {v.historial.length === 0 ? <p className="adm-sub">Sin movimientos registrados.</p>
        : <ol className="adm-historial">{v.historial.map((h: { estado: string; en: string; motivo: string }, i: number) =>
          <li key={i}><b>{ESTADO_TEXTO[h.estado as EstadoPedido] ?? h.estado}</b><small>{fechaHora(h.en)}{h.motivo ? ` · ${h.motivo}` : ''}</small></li>)}</ol>}
    </div>

    {dialogo === 'completar' && <Confirmar titulo="¿Marcar como completada?" texto="Confirmás que la transferencia ya llegó. La venta pasa a «Completado» y el cliente recibe el mail «Recibimos tu transferencia»." confirmar="Sí, completar" ocupado={ocupado} onConfirmar={completar} onCancelar={cerrarDialogo} />}
    {dialogo === 'cancelar' && <Confirmar titulo="¿Cancelar la venta?" texto="Solo se cancelan ventas que todavía no se cobraron. Esto no se puede deshacer." confirmar="Sí, cancelar" peligro ocupado={ocupado} onConfirmar={cancelar} onCancelar={cerrarDialogo}>
      <label className={`adm-campo${errorMotivo ? ' adm-campo--error' : ''}`} style={{ marginBottom: 14 }}>
        <span>Motivo</span>
        <textarea className="adm-textarea" value={motivo} maxLength={300} onChange={ev => { setMotivo(ev.target.value); setErrorMotivo(null) }} aria-invalid={!!errorMotivo} aria-describedby={errorMotivo ? 'adm-motivo-error' : undefined} />
        {errorMotivo && <small id="adm-motivo-error" role="alert" style={{ color: 'var(--error)', fontWeight: 600 }}>{errorMotivo}</small>}
      </label>
    </Confirmar>}
  </>
}

export default function VentaPage() {
  return <Acceso permiso="ventas:ver"><Venta /></Acceso>
}
