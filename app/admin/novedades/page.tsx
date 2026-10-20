'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bold, Eye, ImagePlus, Link2, Mail, Send, X } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Campo } from '@/components/admin/campo'
import { mini, useSubida } from '@/components/admin/fotos'
import { Aviso, Confirmar, fechaHora } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import { MAX_MENSAJE } from '@/lib/novedades-formato'

type Envio = { id: string; asunto: string; estado: string; creadoEn: string | null; total: number; enviados: number; fallidos: number; omitidos: number; pendientes: number; ultimoError: string | null; por: string }
type Cupo = { usados: number; limite: number; reserva: number; disponibles: number }

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  preparando: { texto: 'Preparando', clase: 'adm-chip--espera' },
  en_cola: { texto: 'En cola', clase: 'adm-chip--espera' },
  enviando: { texto: 'Enviando…', clase: 'adm-chip--espera' },
  completado: { texto: 'Completado', clase: 'adm-chip--ok' },
  error: { texto: 'Con errores', clase: 'adm-chip--malo' },
}
const ACTIVOS = ['preparando', 'en_cola', 'enviando']

function Novedades() {
  const { api, avisar } = useAdmin()
  const subir = useSubida()
  const area = useRef<HTMLTextAreaElement>(null)
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [imagen, setImagen] = useState<string | null>(null)
  const [errores, setErrores] = useState<{ asunto?: string; mensaje?: string }>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [cargandoVista, setCargandoVista] = useState(false)
  const [probando, setProbando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [historial, setHistorial] = useState<Envio[] | null>(null)
  const [suscriptos, setSuscriptos] = useState<number | null>(null)
  const [cupo, setCupo] = useState<Cupo | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [continuando, setContinuando] = useState<string | null>(null)

  const cargar = useCallback(async (liviano = false) => {
    const r = await api<{ historial: Envio[]; suscriptos: number | null; cupo: Cupo }>(`/api/admin/novedades${liviano ? '?liviano=1' : ''}`)
    if (!r.ok) { if (!liviano) setErrorCarga(r.cuerpo.error || 'No pudimos cargar las novedades.'); return }
    setHistorial(r.cuerpo.historial)
    setCupo(r.cuerpo.cupo)
    if (r.cuerpo.suscriptos !== null) setSuscriptos(r.cuerpo.suscriptos)
    setErrorCarga(null)
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  // Mientras haya un envío en marcha, el historial se actualiza solo.
  const hayActivos = !!historial?.some(e => ACTIVOS.includes(e.estado))
  useEffect(() => {
    if (!hayActivos) return
    const t = setInterval(() => { void cargar(true) }, 12_000)
    return () => clearInterval(t)
  }, [hayActivos, cargar])

  const cuerpo = () => JSON.stringify({ asunto, mensaje, imagen })
  const cambiar = <T,>(poner: (v: T) => void, v: T) => { poner(v); setVista(null); setErrorGeneral(null) }

  function validar(): boolean {
    const e: { asunto?: string; mensaje?: string } = {}
    if (asunto.trim().length < 3) e.asunto = 'Escribí el asunto (mínimo 3 letras).'
    else if (asunto.trim().length > 120) e.asunto = 'Máximo 120 letras.'
    if (!mensaje.trim()) e.mensaje = 'Escribí el mensaje.'
    else if (mensaje.length > MAX_MENSAJE) e.mensaje = `Máximo ${MAX_MENSAJE} letras.`
    setErrores(e)
    if (e.asunto) document.getElementById('nv-asunto')?.focus()
    else if (e.mensaje) document.getElementById('nv-mensaje')?.focus()
    return !e.asunto && !e.mensaje
  }

  /** Pone las marcas alrededor del texto seleccionado (o de un ejemplo). */
  function marcar(antes: string, despues: string, relleno: string) {
    const el = area.current
    const ini = el?.selectionStart ?? mensaje.length, fin = el?.selectionEnd ?? mensaje.length
    const sel = mensaje.slice(ini, fin) || relleno
    cambiar(setMensaje, mensaje.slice(0, ini) + antes + sel + despues + mensaje.slice(fin))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + antes.length, ini + antes.length + sel.length) })
  }

  async function elegirImagen(archivo: File | undefined) {
    if (!archivo) return
    setErrorImagen(null); setSubiendo(true)
    try { cambiar(setImagen, await subir(archivo, 'imagen')) } catch (e) { setErrorImagen((e as Error).message) }
    setSubiendo(false)
  }

  async function verVista() {
    if (!validar()) return
    setCargandoVista(true)
    const r = await api<{ html: string }>('/api/admin/novedades/vista-previa', { method: 'POST', body: cuerpo() })
    setCargandoVista(false)
    if (!r.ok) { setErrorGeneral(r.cuerpo.error || 'No pudimos armar la vista previa.'); return }
    setVista(r.cuerpo.html)
  }

  async function mandarPrueba() {
    if (!validar()) return
    setProbando(true)
    const r = await api<{ para: string }>('/api/admin/novedades/prueba', { method: 'POST', body: cuerpo() })
    setProbando(false)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos mandar la prueba.', true); return }
    avisar(`Te mandamos una prueba a ${r.cuerpo.para}.`)
    void cargar(true)
  }

  async function enviar() {
    setEnviando(true)
    const r = await api<{ id: string; total: number; disparado: boolean }>('/api/admin/novedades', { method: 'POST', body: cuerpo() })
    setEnviando(false)
    setConfirmando(false)
    if (!r.ok) { setErrorGeneral(r.cuerpo.error || 'No pudimos preparar el envío.'); return }
    setAsunto(''); setMensaje(''); setImagen(null); setVista(null); setErrores({})
    avisar(r.cuerpo.disparado ? `Envío en marcha: ${r.cuerpo.total} ${r.cuerpo.total === 1 ? 'persona' : 'personas'}.` : 'El envío quedó en cola, pero no pudimos despertarlo. Tocá «Continuar el envío».', !r.cuerpo.disparado)
    await cargar()
  }

  async function continuar(id: string) {
    setContinuando(id)
    const r = await api<{ disparado: boolean }>(`/api/admin/novedades/${encodeURIComponent(id)}/continuar`, { method: 'POST', body: '{}' })
    setContinuando(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos continuar el envío.', true); return }
    avisar(r.cuerpo.disparado ? 'Seguimos enviando.' : 'No pudimos despertar el envío. Probá de nuevo en un minuto.', !r.cuerpo.disparado)
    await cargar(true)
  }

  const hoy = cupo && suscriptos !== null ? Math.min(cupo.disponibles, suscriptos) : null
  const resto = suscriptos !== null && hoy !== null ? suscriptos - hoy : 0

  return <>
    <div className="adm-head"><div><p className="eyebrow">Panel</p><h1 className="adm-title">Enviar novedades</h1><p className="adm-sub">Un mail para todas las personas que pidieron recibir novedades.</p></div></div>

    {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
    {suscriptos !== null && cupo && <Aviso tipo="info">
      <b>{suscriptos} {suscriptos === 1 ? 'persona suscripta' : 'personas suscriptas'}</b> (con el email verificado). Hoy se pueden mandar <b>{cupo.disponibles}</b> novedades: el plan de Resend permite {cupo.limite} mails por día y se reservan {cupo.reserva} para los de ventas. Lo que no entre hoy sigue solo los días siguientes.
    </Aviso>}

    <div className="adm-card">
      <h2>Nueva novedad</h2>
      {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}
      <div className="adm-grid">
        <Campo etiqueta="Asunto" error={errores.asunto}>
          <input id="nv-asunto" className="adm-input" value={asunto} maxLength={120} autoComplete="off" aria-invalid={!!errores.asunto} onChange={e => { cambiar(setAsunto, e.target.value); setErrores(p => ({ ...p, asunto: undefined })) }} />
        </Campo>
        <div className="adm-campo">
          <span>Mensaje</span>
          <div className="adm-actions" role="toolbar" aria-label="Formato del mensaje">
            <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => marcar('**', '**', 'texto en negrita')}><Bold size={16} aria-hidden="true" />Negrita</button>
            <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => marcar('[', '](https://)', 'texto del link')}><Link2 size={16} aria-hidden="true" />Link</button>
          </div>
          <textarea id="nv-mensaje" ref={area} className="adm-textarea" style={{ minHeight: 200 }} value={mensaje} maxLength={MAX_MENSAJE} aria-invalid={!!errores.mensaje} onChange={e => { cambiar(setMensaje, e.target.value); setErrores(p => ({ ...p, mensaje: undefined })) }} />
          {errores.mensaje && <small role="alert" style={{ color: 'var(--error)', fontWeight: 600 }}>{errores.mensaje}</small>}
          <small>Una línea en blanco separa los párrafos. Negrita: **así**. Link: [texto](https://direccion). No se acepta HTML.</small>
        </div>

        <div className="adm-campo">
          <span>Imagen (opcional)</span>
          {errorImagen && <Aviso tipo="error">{errorImagen}</Aviso>}
          {imagen
            ? <div className="adm-fila-top" style={{ justifyContent: 'flex-start', gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mini(imagen)} alt="Imagen del mail" width={96} height={96} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 14 }} />
                <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => cambiar(setImagen, null)}><X size={16} aria-hidden="true" />Quitar</button>
              </div>
            : <label className="button adm-btn adm-btn--ghost" style={{ cursor: 'pointer', position: 'relative' }}>
                <ImagePlus size={16} aria-hidden="true" />Subir imagen
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} disabled={subiendo} onChange={e => { void elegirImagen(e.target.files?.[0]); e.target.value = '' }} />
              </label>}
          <CargaGemma mensaje="Subiendo la imagen…" activa={subiendo} compacta />
        </div>
      </div>

      <div className="adm-actions" style={{ marginTop: 16 }}>
        <button type="button" className="button adm-btn adm-btn--ghost" onClick={verVista} disabled={cargandoVista}><Eye size={16} aria-hidden="true" />Ver vista previa</button>
        <button type="button" className="button adm-btn adm-btn--ghost" onClick={mandarPrueba} disabled={probando}><Mail size={16} aria-hidden="true" />{probando ? 'Mandando…' : 'Enviarme una prueba'}</button>
        <button type="button" className="button button--pink adm-btn" onClick={() => { if (validar()) setConfirmando(true) }} disabled={!suscriptos}><Send size={16} aria-hidden="true" />Enviar</button>
      </div>
      {suscriptos === 0 && <p className="adm-sub">Todavía no hay personas suscriptas con el email verificado.</p>}
      <CargaGemma mensaje="Armando la vista previa…" activa={cargandoVista} compacta />
      <CargaGemma mensaje="Mandándote la prueba…" activa={probando} compacta />
    </div>

    {vista && <div className="adm-card">
      <h2>Vista previa</h2>
      <iframe title="Vista previa del mail" sandbox="" srcDoc={vista} style={{ width: '100%', height: 560, border: '1px solid rgba(15,15,16,.12)', borderRadius: 16, background: '#fff' }} />
      <p className="adm-sub">Así lo van a ver. «Darme de baja» es un link distinto para cada persona.</p>
    </div>}

    <h2 className="adm-title" style={{ fontSize: 22, margin: '22px 0 12px' }}>Historial de envíos</h2>
    {!historial && !errorCarga && <CargaGemma mensaje="Buscando los envíos…" compacta />}
    {historial && (historial.length === 0
      ? <div className="adm-card adm-vacio">Todavía no mandaste ninguna novedad.</div>
      : <ul className="adm-lista">{historial.map(e => {
        const est = ESTADOS[e.estado] ?? { texto: e.estado, clase: '' }
        return <li key={e.id} className="adm-fila">
          <div className="adm-fila-top"><p className="adm-fila-titulo">{e.asunto}</p><span className={`adm-chip ${est.clase}`}>{est.texto}</span></div>
          <div className="adm-fila-meta"><span>{fechaHora(e.creadoEn)}</span><span>·</span><span>{e.por}</span></div>
          <div className="adm-fila-meta">
            <span><b>{e.enviados}</b> de {e.total} enviados</span>
            {e.pendientes > 0 && <span className="adm-chip adm-chip--espera">{e.pendientes} pendientes</span>}
            {e.fallidos > 0 && <span className="adm-chip adm-chip--malo">{e.fallidos} con error</span>}
            {e.omitidos > 0 && <span className="adm-chip">{e.omitidos} se dieron de baja</span>}
          </div>
          {e.ultimoError && ACTIVOS.includes(e.estado) && <p className="adm-sub" style={{ margin: 0 }}>{e.ultimoError}</p>}
          {(e.estado === 'en_cola' || e.estado === 'enviando') && e.pendientes > 0 && <div className="adm-actions">
            <button type="button" className="button adm-btn adm-btn--ghost" disabled={continuando === e.id} onClick={() => continuar(e.id)}>{continuando === e.id ? 'Un momento…' : 'Continuar el envío'}</button>
          </div>}
        </li>
      })}</ul>)}

    {confirmando && <Confirmar titulo={`¿Enviar a ${suscriptos} ${suscriptos === 1 ? 'persona' : 'personas'}?`} confirmar="Sí, enviar" ocupado={enviando} onConfirmar={enviar} onCancelar={() => !enviando && setConfirmando(false)}
      texto={`«${asunto.trim()}» va a todas las personas suscriptas con el email verificado.${resto > 0 ? ` Hoy se mandan ${hoy}; las otras ${resto} salen solas en los días siguientes, por el límite diario de Resend.` : ' Se manda hoy.'} No se puede deshacer.`} />}
    <CargaGemma mensaje="Preparando el envío…" activa={enviando} />
  </>
}

export default function NovedadesPage() {
  return <Acceso min="admin"><Novedades /></Acceso>
}
