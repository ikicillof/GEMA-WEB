'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Mail, ShieldAlert } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Aviso, claseEstado, fechaHora, textoMetodo } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import { ESTADOS, ESTADO_TEXTO } from '@/lib/pedidos'
import { formatPrice } from '@/lib/products'
import type { VentaResumen } from '@/lib/server/ventas-admin'

/** Día local (aaaa-mm-dd) de una fecha ISO, para comparar con los filtros de fecha. */
const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '')
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function Ventas() {
  const { api, puede, avisar } = useAdmin()
  const [ventas, setVentas] = useState<VentaResumen[] | null>(null)
  const [limite, setLimite] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [metodo, setMetodo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cargar = useCallback(async () => {
    const r = await api<{ ventas: VentaResumen[]; limite: number }>('/api/admin/ventas')
    if (r.ok) { setVentas(r.cuerpo.ventas); setLimite(r.cuerpo.limite); setError(null) } else setError(r.cuerpo.error || 'No pudimos cargar las ventas.')
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  const filtradas = useMemo(() => {
    const busca = normal(q)
    return (ventas ?? []).filter(v =>
      (!estado || v.estado === estado) && (!metodo || v.metodoPago === metodo)
      && (!desde || dia(v.creadoEn) >= desde) && (!hasta || dia(v.creadoEn) <= hasta)
      && (!busca || normal(`${v.id} ${v.cliente} ${v.email}`).includes(busca)))
  }, [ventas, q, estado, metodo, desde, hasta])

  const conRevision = (ventas ?? []).filter(v => v.requiereRevision).length
  const conMails = (ventas ?? []).filter(v => v.mailsPendientes).length

  async function reintentar() {
    setReintentando(true)
    const r = await api<{ ventas: number; reintentados: number; siguenFallando: number }>('/api/admin/mails/reintentar', { method: 'POST', body: '{}' })
    setReintentando(false)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos reintentar los mails.', true); return }
    avisar(r.cuerpo.siguenFallando ? `Se reintentaron ${r.cuerpo.reintentados} mails; ${r.cuerpo.siguenFallando} siguen fallando.` : `Listo: se enviaron ${r.cuerpo.reintentados} mails.`, r.cuerpo.siguenFallando > 0)
    await cargar()
  }

  return <>
    <div className="adm-head">
      <div><p className="eyebrow">Panel</p><h1 className="adm-title">Ventas</h1></div>
    </div>

    {error && <Aviso tipo="error">{error}</Aviso>}
    {conRevision > 0 && <Aviso tipo="error"><b>{conRevision === 1 ? '1 venta pide revisión' : `${conRevision} ventas piden revisión`}.</b> Entrá a cada una (están marcadas en rojo) para ver el motivo.</Aviso>}
    {conMails > 0 && <Aviso>
      <b>{conMails === 1 ? '1 venta tiene mails sin enviar' : `${conMails} ventas tienen mails sin enviar`}.</b>
      {puede('admin') && <div><button type="button" className="button button--pink adm-btn" onClick={reintentar} disabled={reintentando}><Mail size={16} aria-hidden="true" />{reintentando ? 'Reintentando…' : 'Reintentar el envío'}</button></div>}
    </Aviso>}

    <div className="adm-toolbar adm-toolbar--ventas">
      <input className="adm-input" type="search" inputMode="search" placeholder="Buscar por n.º de pedido o cliente" aria-label="Buscar por número de pedido o cliente" value={q} onChange={e => setQ(e.target.value)} />
      <div className="adm-filtros">
        <select className="adm-select" aria-label="Estado" value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_TEXTO[e]}</option>)}
        </select>
        <select className="adm-select" aria-label="Método de pago" value={metodo} onChange={e => setMetodo(e.target.value)}>
          <option value="">Todos los pagos</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>
      <div className="adm-filtros">
        <label className="adm-campo"><span>Desde</span><input className="adm-input" type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} /></label>
        <label className="adm-campo"><span>Hasta</span><input className="adm-input" type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} /></label>
      </div>
    </div>

    {!ventas && !error && <CargaGemma mensaje="Buscando las ventas…" compacta />}
    {ventas && <>
      <p className="adm-sub" role="status" style={{ margin: '0 0 10px' }}>{filtradas.length} {filtradas.length === 1 ? 'venta' : 'ventas'}{limite && ventas.length >= limite ? ` (se muestran las últimas ${limite})` : ''}</p>
      {filtradas.length === 0
        ? <div className="adm-card adm-vacio">{ventas.length === 0 ? 'Todavía no hay ventas.' : 'Ninguna venta coincide con los filtros.'}</div>
        : <ul className="adm-lista">{filtradas.map(v =>
          <li key={v.id}>
            <Link href={`/admin/ventas/${v.id}`} className={`adm-fila${v.requiereRevision ? ' adm-fila--revision' : ''}`}>
              <div className="adm-fila-top">
                <p className="adm-fila-titulo">{v.cliente || v.email || 'Sin nombre'}</p>
                <span className="adm-fila-precio">{formatPrice(v.total)}</span>
              </div>
              <div className="adm-fila-meta">
                <span className={`adm-chip ${claseEstado(v.estado)}`}>{ESTADO_TEXTO[v.estado]}</span>
                {v.modoPrueba && <span className="adm-chip adm-chip--prueba">Prueba</span>}
                {v.requiereRevision && <span className="adm-chip adm-chip--malo"><ShieldAlert size={12} aria-hidden="true" />Revisar</span>}
                {v.mailsPendientes && <span className="adm-chip adm-chip--espera"><Mail size={12} aria-hidden="true" />Mails sin enviar</span>}
              </div>
              <div className="adm-fila-meta">
                <span>{textoMetodo(v.metodoPago)}</span><span>·</span><span>{v.cantidad} {v.cantidad === 1 ? 'producto' : 'productos'}</span><span>·</span><span>{fechaHora(v.creadoEn)}</span>
                <ChevronRight size={16} aria-hidden="true" style={{ marginLeft: 'auto' }} />
              </div>
              <div className="adm-fila-meta"><span>N.º {v.id}</span></div>
            </Link>
          </li>)}</ul>}
    </>}
  </>
}

export default function VentasPage() {
  return <Acceso permiso="ventas:ver"><Ventas /></Acceso>
}
