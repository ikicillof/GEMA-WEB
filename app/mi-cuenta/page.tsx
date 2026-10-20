'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { CargaGemma } from '@/components/carga-gemma'

export default function MiCuentaPage() {
  const { sesion, cargando, abrirLogin, llamar } = useAuth()
  const uid = sesion?.user.uid
  const [recibe, setRecibe] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (!uid) { setRecibe(null); return }
    let cancelado = false
    llamar('/api/cuenta/novedades').then(async r => {
      const cuerpo = await r.json().catch(() => ({}))
      if (cancelado) return
      if (r.ok) setRecibe(cuerpo.recibeNovedades === true); else setError(cuerpo.error || 'No pudimos cargar tu cuenta.')
    }).catch(() => { if (!cancelado) setError('No pudimos cargar tu cuenta. Revisá tu conexión.') })
    return () => { cancelado = true }
  }, [uid, llamar])

  async function cambiar(valor: boolean) {
    setError(null); setGuardado(false); setGuardando(true)
    try {
      const r = await llamar('/api/cuenta/novedades', { method: 'POST', body: JSON.stringify({ recibe: valor }) })
      const cuerpo = await r.json().catch(() => ({}))
      if (r.ok) { setRecibe(cuerpo.recibeNovedades === true); setGuardado(true) } else setError(cuerpo.error || 'No pudimos guardar el cambio.')
    } catch { setError('No pudimos guardar el cambio. Revisá tu conexión.') }
    setGuardando(false)
  }

  if (cargando || (sesion && recibe === null && !error)) return <CargaGemma mensaje="Abriendo tu cuenta…" />

  if (!sesion) {
    return <section className="page-hero"><div className="shell">
      <p className="eyebrow">Tu cuenta</p>
      <h1 className="page-title">Mi cuenta</h1>
      <p className="page-hero-copy">Ingresá para ver y cambiar tus preferencias.</p>
      <button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar', '/mi-cuenta')}>Ingresar</button>
    </div></section>
  }

  return <section className="checkout"><div className="shell">
    <p className="eyebrow">Tu cuenta</p>
    <h1 className="page-title checkout-title">Mi cuenta</h1>
    <div className="checkout-main">
      <div className="checkout-card">
        <h2>Tus datos</h2>
        <div className="cuenta-datos"><b>Nombre</b><span>{sesion.user.displayName || '—'}</span></div>
        <div className="cuenta-datos"><b>Email</b><span>{sesion.user.email}</span></div>
      </div>
      <div className="checkout-card">
        <h2>Novedades por email</h2>
        <label className="auth-check">
          <input type="checkbox" checked={recibe === true} disabled={guardando || recibe === null} onChange={e => cambiar(e.target.checked)} />
          <span>Quiero recibir novedades de Gemma por email</span>
        </label>
        <p className="checkout-hint">Te escribimos solo cuando hay algo para contarte. En cada mail hay un link para darte de baja.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {guardado && !error && <p className="auth-ok" role="status">{recibe ? 'Listo, vas a recibir las novedades.' : 'Listo, no vas a recibir más novedades.'}</p>}
        <CargaGemma compacta activa={guardando} mensaje="Guardando el cambio…" />
      </div>
    </div>
  </div></section>
}
