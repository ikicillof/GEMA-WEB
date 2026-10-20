'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, UserMinus, UserPlus } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Campo } from '@/components/admin/campo'
import { Aviso, Confirmar } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import { PERMISOS_COLABORADOR, type Permiso, type Rol } from '@/lib/roles'

type Persona = { uid: string; email: string; nombre: string; rol: Rol; permisos: Permiso[] }
const TEXTO_ROL: Record<string, string> = { creador: 'Creador', admin: 'Admin', colaborador: 'Colaborador' }
const TEXTO_PERMISO: Record<Permiso, string> = { 'ventas:ver': 'Ver ventas', 'productos:ver': 'Ver productos' }
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function Equipo() {
  const { api, yo, avisar } = useAdmin()
  const [equipo, setEquipo] = useState<Persona[] | null>(null)
  const [miUid, setMiUid] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<'colaborador' | 'admin'>('colaborador')
  const [permisos, setPermisos] = useState<Permiso[]>([...PERMISOS_COLABORADOR])
  const [errorEmail, setErrorEmail] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [quitar, setQuitar] = useState<Persona | null>(null)
  const [editar, setEditar] = useState<Persona | null>(null)
  const [permisosEdit, setPermisosEdit] = useState<Permiso[]>([])
  const [ocupado, setOcupado] = useState(false)
  const esCreador = yo.rol === 'creador'

  const cargar = useCallback(async () => {
    const r = await api<{ equipo: Persona[]; yo: string }>('/api/admin/equipo')
    if (r.ok) { setEquipo(r.cuerpo.equipo); setMiUid(r.cuerpo.yo); setError(null) } else setError(r.cuerpo.error || 'No pudimos cargar el equipo.')
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  /** Misma regla que el servidor (cambiarRol), solo para no mostrar botones que van a fallar. */
  const puedeGestionar = (p: Persona) => p.rol !== 'creador' && p.uid !== miUid && (esCreador || (yo.rol === 'admin' && p.rol === 'colaborador'))
  const alternarPermiso = (lista: Permiso[], p: Permiso) => (lista.includes(p) ? lista.filter(x => x !== p) : [...lista, p])

  async function agregar(ev: FormEvent) {
    ev.preventDefault()
    const limpio = email.trim().toLowerCase()
    if (!EMAIL.test(limpio)) { setErrorEmail('Escribí un email válido.'); return }
    setErrorEmail(null)
    setAgregando(true)
    const r = await api('/api/admin/equipo', { method: 'POST', body: JSON.stringify({ email: limpio, rol, ...(rol === 'colaborador' ? { permisos } : {}) }) })
    setAgregando(false)
    if (!r.ok) { setErrorEmail(r.cuerpo.error || 'No pudimos sumar a esa persona.'); return }
    setEmail('')
    avisar(`${limpio} ahora es ${rol === 'admin' ? 'admin' : 'colaborador'}. Tiene que volver a ingresar.`)
    await cargar()
  }

  async function confirmarQuitar() {
    if (!quitar) return
    setOcupado(true)
    const r = await api('/api/admin/equipo', { method: 'POST', body: JSON.stringify({ email: quitar.email, rol: 'cliente' }) })
    setOcupado(false)
    const quien = quitar.email
    setQuitar(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos quitar a esa persona.', true); return }
    avisar(`${quien} ya no tiene acceso al panel.`)
    await cargar()
  }

  async function guardarPermisos() {
    if (!editar) return
    setOcupado(true)
    const r = await api('/api/admin/equipo', { method: 'POST', body: JSON.stringify({ email: editar.email, rol: 'colaborador', permisos: permisosEdit }) })
    setOcupado(false)
    const quien = editar.email
    setEditar(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos cambiar los permisos.', true); return }
    avisar(`Permisos de ${quien} actualizados.`)
    await cargar()
  }

  return <>
    <div className="adm-head"><div><p className="eyebrow">Panel</p><h1 className="adm-title">Equipo</h1><p className="adm-sub">Quiénes tienen acceso al panel y qué pueden hacer.</p></div></div>
    {error && <Aviso tipo="error">{error}</Aviso>}

    <div className="adm-card">
      <h2>Sumar a alguien</h2>
      <form onSubmit={agregar} noValidate>
        <div className="adm-grid adm-grid--2">
          <Campo etiqueta="Email de la cuenta" error={errorEmail ?? undefined} ayuda="La persona tiene que haber creado su cuenta en la tienda y verificado su email.">
            <input className="adm-input" type="email" inputMode="email" autoComplete="off" value={email} aria-invalid={!!errorEmail} onChange={e => { setEmail(e.target.value); setErrorEmail(null) }} />
          </Campo>
          <Campo etiqueta="Rol">
            <select className="adm-select" value={rol} onChange={e => setRol(e.target.value as 'colaborador' | 'admin')}>
              <option value="colaborador">Colaborador (solo ve productos y ventas)</option>
              {esCreador && <option value="admin">Admin (puede modificar todo)</option>}
            </select>
          </Campo>
        </div>
        {rol === 'colaborador' && <div role="group" aria-label="Permisos del colaborador" style={{ marginTop: 10 }}>
          {PERMISOS_COLABORADOR.map(p => <label key={p} className="adm-check"><input type="checkbox" checked={permisos.includes(p)} onChange={() => setPermisos(alternarPermiso(permisos, p))} />{TEXTO_PERMISO[p]}</label>)}
        </div>}
        <div className="adm-actions" style={{ marginTop: 12 }}>
          <button type="submit" className="button button--pink adm-btn" disabled={agregando}><UserPlus size={16} aria-hidden="true" />{agregando ? 'Sumando…' : 'Sumar al equipo'}</button>
        </div>
      </form>
    </div>

    <h2 className="adm-title" style={{ fontSize: 22, margin: '22px 0 12px' }}>Personas con acceso</h2>
    {!equipo && !error && <CargaGemma mensaje="Buscando al equipo…" compacta />}
    {equipo && <ul className="adm-lista">{equipo.map(p =>
      <li key={p.uid} className="adm-fila">
        <div className="adm-fila-top">
          <p className="adm-fila-titulo">{p.nombre || p.email}{p.uid === miUid ? ' (vos)' : ''}</p>
          <span className={`adm-chip ${p.rol === 'colaborador' ? '' : 'adm-chip--listo'}`}><ShieldCheck size={12} aria-hidden="true" />{TEXTO_ROL[p.rol]}</span>
        </div>
        <div className="adm-fila-meta"><span>{p.email}</span></div>
        {p.rol === 'colaborador' && <div className="adm-fila-meta">{p.permisos.length ? p.permisos.map(x => <span key={x} className="adm-chip">{TEXTO_PERMISO[x] ?? x}</span>) : <span>Sin permisos</span>}</div>}
        {puedeGestionar(p) && <div className="adm-actions">
          {p.rol === 'colaborador' && <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => { setEditar(p); setPermisosEdit(p.permisos) }}>Cambiar permisos</button>}
          <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => setQuitar(p)}><UserMinus size={16} aria-hidden="true" />Quitar del equipo</button>
        </div>}
        {p.rol === 'creador' && <p className="adm-sub" style={{ margin: 0 }}>El creador no se puede modificar.</p>}
      </li>)}</ul>}
    <p className="adm-sub" style={{ marginTop: 14 }}>{esCreador ? 'Como creador podés sumar y quitar admins y colaboradores.' : 'Como admin podés sumar y quitar colaboradores. Los admins los gestiona el creador.'} Cada cambio queda registrado en la auditoría.</p>

    {quitar && <Confirmar titulo={`¿Quitar a ${quitar.nombre || quitar.email}?`} texto={`${quitar.email} vuelve a ser cliente y pierde el acceso al panel ahora mismo.`} confirmar="Sí, quitar" peligro ocupado={ocupado} onConfirmar={confirmarQuitar} onCancelar={() => !ocupado && setQuitar(null)} />}
    {editar && <Confirmar titulo="Permisos del colaborador" texto={editar.email} confirmar="Guardar permisos" ocupado={ocupado} onConfirmar={guardarPermisos} onCancelar={() => !ocupado && setEditar(null)}>
      <div role="group" aria-label="Permisos" style={{ marginBottom: 12 }}>
        {PERMISOS_COLABORADOR.map(p => <label key={p} className="adm-check"><input type="checkbox" checked={permisosEdit.includes(p)} onChange={() => setPermisosEdit(alternarPermiso(permisosEdit, p))} />{TEXTO_PERMISO[p]}</label>)}
      </div>
    </Confirmar>}
  </>
}

export default function EquipoPage() {
  return <Acceso min="admin"><Equipo /></Acceso>
}
