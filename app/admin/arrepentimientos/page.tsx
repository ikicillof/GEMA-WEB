'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, ShieldAlert } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Aviso, fechaHora } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import type { ArrepentimientoResumen } from '@/lib/server/arrepentimientos-admin'

type Estado = ArrepentimientoResumen['estado']
const ESTADOS: { valor: Estado; texto: string; clase: string }[] = [
  { valor: 'recibido', texto: 'Recibido', clase: 'adm-chip--espera' },
  { valor: 'en_gestion', texto: 'En gestión', clase: '' },
  { valor: 'resuelto', texto: 'Resuelto', clase: 'adm-chip--ok' },
]
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function Arrepentimientos() {
  const { api, puede, avisar } = useAdmin()
  const [lista, setLista] = useState<ArrepentimientoResumen[] | null>(null)
  const [limite, setLimite] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('')
  const [ocupada, setOcupada] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const r = await api<{ solicitudes: ArrepentimientoResumen[]; limite: number }>('/api/admin/arrepentimientos')
    if (r.ok) { setLista(r.cuerpo.solicitudes); setLimite(r.cuerpo.limite); setError(null) } else setError(r.cuerpo.error || 'No pudimos cargar las solicitudes.')
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  const filtradas = useMemo(() => {
    const busca = normal(q)
    return (lista ?? []).filter(s => (!filtro || s.estado === filtro) && (!busca || normal(`${s.tramite} ${s.pedido} ${s.nombre} ${s.email}`).includes(busca)))
  }, [lista, q, filtro])

  const nuevas = (lista ?? []).filter(s => s.estado === 'recibido').length
  const conMails = (lista ?? []).filter(s => s.mailsPendientes).length

  async function cambiarEstado(s: ArrepentimientoResumen, estado: Estado) {
    if (estado === s.estado) return
    setOcupada(s.tramite)
    const r = await api(`/api/admin/arrepentimientos/${encodeURIComponent(s.tramite)}`, { method: 'PATCH', body: JSON.stringify({ estado }) })
    setOcupada(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos cambiar el estado.', true); return }
    setLista(l => l && l.map(x => x.tramite === s.tramite ? { ...x, estado } : x))
  }

  async function reintentar(s: ArrepentimientoResumen, cual: 'cliente' | 'duena') {
    setOcupada(`${s.tramite}:${cual}`)
    const r = await api<{ estado: string; error: string | null }>(`/api/admin/arrepentimientos/${encodeURIComponent(s.tramite)}`, { method: 'POST', body: JSON.stringify({ cual }) })
    setOcupada(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos reintentar el mail.', true); await cargar(); return }
    const ok = r.cuerpo.estado === 'enviado'
    avisar(ok ? `Listo: se envió el mail ${cual === 'cliente' ? 'al cliente' : 'a la dueña'}.` : `El mail ${cual === 'cliente' ? 'al cliente' : 'a la dueña'} sigue fallando: ${r.cuerpo.error ?? 'revisá Resend'}.`, !ok)
    await cargar()
  }

  return <>
    <div className="adm-head"><div><p className="eyebrow">Panel</p><h1 className="adm-title">Arrepentimientos</h1><p className="adm-sub">Solicitudes del botón de arrepentimiento. Respondé a cada persona por email con las instrucciones de la devolución.</p></div></div>

    {error && <Aviso tipo="error">{error}</Aviso>}
    {nuevas > 0 && <Aviso tipo="info"><b>{nuevas === 1 ? '1 solicitud nueva' : `${nuevas} solicitudes nuevas`}</b> sin gestionar.</Aviso>}
    {conMails > 0 && <Aviso><b>{conMails === 1 ? '1 solicitud tiene mails sin enviar' : `${conMails} solicitudes tienen mails sin enviar`}.</b> Reintentá cada mail por separado con «Reintentar este mail».</Aviso>}

    <div className="adm-toolbar">
      <input className="adm-input" type="search" inputMode="search" placeholder="Buscar por trámite, pedido, nombre o email" aria-label="Buscar solicitudes" value={q} onChange={e => setQ(e.target.value)} />
      <select className="adm-select" aria-label="Estado" value={filtro} onChange={e => setFiltro(e.target.value)}>
        <option value="">Todos los estados</option>
        {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
      </select>
    </div>

    {!lista && !error && <CargaGemma mensaje="Buscando las solicitudes…" compacta />}
    {lista && <>
      <p className="adm-sub" role="status" style={{ margin: '0 0 10px' }}>{filtradas.length} {filtradas.length === 1 ? 'solicitud' : 'solicitudes'}{limite && lista.length >= limite ? ` (se muestran las últimas ${limite})` : ''}</p>
      {filtradas.length === 0
        ? <div className="adm-card adm-vacio">{lista.length === 0 ? 'Todavía no hay solicitudes de arrepentimiento.' : 'Ninguna solicitud coincide con los filtros.'}</div>
        : <ul className="adm-lista">{filtradas.map(s => {
          const est = ESTADOS.find(e => e.valor === s.estado)!
          return <li key={s.tramite} className="adm-fila">
            <div className="adm-fila-top"><p className="adm-fila-titulo">{s.nombre}</p><span className={`adm-chip ${est.clase}`}>{est.texto}</span></div>
            <div className="adm-fila-meta"><span><b>{s.tramite}</b></span><span>·</span><span>{fechaHora(s.creadoEn)}</span></div>
            <div className="adm-fila-meta"><span>Pedido N.º {s.pedido}</span><span>·</span><a href={`mailto:${s.email}?subject=${encodeURIComponent(`Tu arrepentimiento ${s.tramite}`)}`}>{s.email}</a></div>
            <div className="adm-fila-meta">
              {!s.pedidoEncontrado && <span className="adm-chip adm-chip--malo"><ShieldAlert size={12} aria-hidden="true" />No encontramos ese pedido</span>}
              {s.pedidoEncontrado && !s.emailCoincide && <span className="adm-chip adm-chip--malo"><ShieldAlert size={12} aria-hidden="true" />El email no coincide con el pedido</span>}
              {s.pedidoEncontrado && s.emailCoincide && <span className="adm-chip adm-chip--ok">Pedido y email verificados</span>}
              {s.modoPrueba && <span className="adm-chip adm-chip--prueba">Prueba</span>}
            </div>
            {s.motivo && <p className="adm-sub" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>Motivo: {s.motivo}</p>}
            {([['cliente', 'Mail al cliente', s.mailCliente], ['duena', 'Mail a la dueña', s.mailDuena]] as const).map(([cual, titulo, m]) => <div key={cual} className="adm-fila-meta">
              <span>{titulo}:</span>
              <span className={`adm-chip ${m.estado === 'enviado' ? 'adm-chip--ok' : m.estado === 'error' ? 'adm-chip--malo' : 'adm-chip--espera'}`}>{m.estado === 'enviado' ? 'Enviado' : m.estado === 'error' ? 'Con error' : 'Pendiente'}{m.intentos > 1 ? ` · ${m.intentos} intentos` : ''}</span>
              {m.error && <span>{m.error}</span>}
              {puede('admin') && m.estado !== 'enviado' && <button type="button" className="button button--pink adm-btn" disabled={ocupada !== null} onClick={() => void reintentar(s, cual)}><Mail size={16} aria-hidden="true" />{ocupada === `${s.tramite}:${cual}` ? 'Un momento…' : 'Reintentar este mail'}</button>}
            </div>)}
            {puede('admin') && <div className="adm-actions">
              <label className="adm-campo"><span>Estado</span>
                <select className="adm-select" value={s.estado} disabled={ocupada !== null} onChange={e => void cambiarEstado(s, e.target.value as Estado)}>
                  {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
                </select>
              </label>
            </div>}
          </li>
        })}</ul>}
    </>}
  </>
}

export default function ArrepentimientosPage() {
  return <Acceso permiso="ventas:ver"><Arrepentimientos /></Acceso>
}
