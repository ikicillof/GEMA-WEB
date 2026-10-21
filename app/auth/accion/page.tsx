'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { CheckCircle2, Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { CargaGemma } from '@/components/carga-gemma'
import { auth } from '@/lib/firebase/client'

// Destino de los links de los mails que manda nuestro backend (lib/server/auth-mails.ts):
//   ?mode=verifyEmail&oobCode=…   -> confirma el email
//   ?mode=resetPassword&oobCode=… -> elige una contraseña nueva
// El oobCode lo genera firebase-admin y lo consume el SDK de Firebase acá, en el navegador.

type Modo = 'verifyEmail' | 'resetPassword'
type Estado =
  | { t: 'cargando' }
  | { t: 'verificado'; yaEstaba?: boolean }
  | { t: 'formulario'; email: string }
  | { t: 'contrasena-lista' }
  | { t: 'error'; modo: Modo; motivo: 'vencido' | 'invalido' | 'deshabilitado' | 'otro' }

const codigoDe = (e: unknown) => (e as { code?: string })?.code ?? ''
const motivoDe = (e: unknown): 'vencido' | 'invalido' | 'deshabilitado' | 'otro' => {
  const c = codigoDe(e)
  if (c === 'auth/expired-action-code') return 'vencido'
  if (c === 'auth/invalid-action-code' || c === 'auth/user-not-found') return 'invalido'
  if (c === 'auth/user-disabled') return 'deshabilitado'
  return 'otro'
}

function Accion() {
  const params = useSearchParams()
  const { abrirLogin } = useAuth()
  const modo = params.get('mode') as Modo | null
  const codigo = params.get('oobCode') ?? ''
  const [estado, setEstado] = useState<Estado>({ t: 'cargando' })
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [ver, setVer] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // El código de un mail se puede usar UNA sola vez: este candado evita que React lo gaste dos veces (modo estricto en desarrollo).
  const corrida = useRef(false)

  useEffect(() => {
    if (corrida.current) return
    corrida.current = true
    if ((modo !== 'verifyEmail' && modo !== 'resetPassword') || !codigo) { setEstado({ t: 'error', modo: modo === 'resetPassword' ? 'resetPassword' : 'verifyEmail', motivo: 'invalido' }); return }
    if (modo === 'verifyEmail') void verificar(codigo)
    else verifyPasswordResetCode(auth, codigo).then(email => setEstado({ t: 'formulario', email })).catch(e => setEstado({ t: 'error', modo: 'resetPassword', motivo: motivoDe(e) }))
  }, [modo, codigo])

  async function verificar(oobCode: string) {
    try {
      await applyActionCode(auth, oobCode)
    } catch (e) {
      // Si ya hay una sesión con ese email verificado, el link "ya usado" en realidad es un éxito.
      try { await auth.currentUser?.reload() } catch { /* sin sesión */ }
      if (codigoDe(e) === 'auth/invalid-action-code' && auth.currentUser?.emailVerified) { setEstado({ t: 'verificado', yaEstaba: true }); return }
      setEstado({ t: 'error', modo: 'verifyEmail', motivo: motivoDe(e) })
      return
    }
    // Con sesión abierta: se actualizan emailVerified y los custom claims (el servidor recalcula el rol con el email ya verificado).
    const u = auth.currentUser
    if (u) {
      try {
        await u.reload()
        const token = await u.getIdToken(true)
        await fetch('/api/auth/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        await u.getIdToken(true)
      } catch { /* el email ya quedó verificado; los claims se ponen al día en el próximo ingreso */ }
    }
    setEstado({ t: 'verificado' })
  }

  async function cambiarContrasena(e: React.FormEvent) {
    e.preventDefault()
    if (enviando) return
    if (pass.length < 8) { setErrorForm('La contraseña tiene que tener al menos 8 caracteres.'); return }
    if (pass !== pass2) { setErrorForm('Las dos contraseñas tienen que ser iguales.'); return }
    setErrorForm(null); setEnviando(true)
    try {
      await confirmPasswordReset(auth, codigo, pass)
      setEstado({ t: 'contrasena-lista' })
    } catch (err) {
      if (codigoDe(err) === 'auth/weak-password') setErrorForm('La contraseña es muy débil. Usá al menos 8 caracteres.')
      else if (codigoDe(err) === 'auth/network-request-failed') setErrorForm('No hay conexión. Revisá tu internet y probá de nuevo.')
      else setEstado({ t: 'error', modo: 'resetPassword', motivo: motivoDe(err) })
    }
    setEnviando(false)
  }

  const Icono = ({ ok }: { ok: boolean }) => ok ? <CheckCircle2 size={34} aria-hidden="true" className="accion-icono accion-icono--ok" /> : <TriangleAlert size={34} aria-hidden="true" className="accion-icono accion-icono--mal" />

  return <section className="accion"><div className="shell"><div className="accion-card" aria-live="polite">
    {estado.t === 'cargando' && <CargaGemma mensaje={modo === 'resetPassword' ? 'Revisando tu enlace…' : 'Confirmando tu email…'} compacta />}

    {estado.t === 'verificado' && <>
      <Icono ok />
      <h1 className="accion-titulo">{estado.yaEstaba ? 'Tu email ya estaba confirmado' : '¡Listo, confirmamos tu email!'}</h1>
      <p>Tu cuenta de Gemma está activa. Ya podés ingresar y hacer tu pedido.</p>
      <div className="accion-botones">
        <button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar')}>Ingresar</button>
        <a className="button button--dark" href="/tienda">Ir a la tienda</a>
      </div>
    </>}

    {estado.t === 'formulario' && <>
      <h1 className="accion-titulo">Elegí tu nueva contraseña</h1>
      <p>Para la cuenta <b>{estado.email}</b>.</p>
      <form className="accion-form" onSubmit={cambiarContrasena} noValidate>
        {errorForm && <p className="auth-error" role="alert">{errorForm}</p>}
        <label className="checkout-field"><span>Contraseña nueva</span>
          <span className="auth-pass"><input type={ver ? 'text' : 'password'} value={pass} onChange={e => { setPass(e.target.value); setErrorForm(null) }} autoComplete="new-password" minLength={8} maxLength={128} required />
            <button type="button" className="auth-pass-ojo" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar las contraseñas' : 'Mostrar las contraseñas'} aria-pressed={ver}>{ver ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span>
          <small className="accion-ayuda">Al menos 8 caracteres.</small>
        </label>
        <label className="checkout-field"><span>Repetí la contraseña</span>
          <input type={ver ? 'text' : 'password'} value={pass2} onChange={e => { setPass2(e.target.value); setErrorForm(null) }} autoComplete="new-password" maxLength={128} required />
        </label>
        <button type="submit" className="button button--pink" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar mi nueva contraseña'}</button>
        <CargaGemma mensaje="Guardando tu contraseña…" activa={enviando} compacta />
      </form>
    </>}

    {estado.t === 'contrasena-lista' && <>
      <Icono ok />
      <h1 className="accion-titulo">¡Listo, cambiaste tu contraseña!</h1>
      <p>Ya podés ingresar con la contraseña nueva.</p>
      <div className="accion-botones"><button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar')}>Iniciar sesión</button></div>
    </>}

    {estado.t === 'error' && <>
      <Icono ok={false} />
      <h1 className="accion-titulo">{estado.motivo === 'vencido' ? 'Este enlace venció' : estado.motivo === 'deshabilitado' ? 'Tu cuenta está deshabilitada' : estado.motivo === 'otro' ? 'No pudimos abrir este enlace' : 'Este enlace no sirve'}</h1>
      <p>{estado.motivo === 'vencido' ? 'Los enlaces duran poco por seguridad.'
        : estado.motivo === 'deshabilitado' ? 'Escribinos y te ayudamos.'
        : estado.motivo === 'otro' ? 'Probá de nuevo en un momento.'
        : 'Ya se usó o no es válido (por ejemplo, si lo copiaste incompleto).'}{estado.motivo === 'deshabilitado' ? '' : ' Pedí uno nuevo y listo.'}</p>
      <div className="accion-botones">
        {estado.modo === 'resetPassword'
          ? <button type="button" className="button button--pink" onClick={() => abrirLogin('recuperar')}>Pedir un enlace nuevo</button>
          : <button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar')}>Ingresar y pedir otro mail</button>}
        <a className="button button--dark" href="/">Ir al inicio</a>
      </div>
      {estado.modo === 'verifyEmail' && <p className="accion-ayuda">Al ingresar con tu email y contraseña te ofrecemos reenviar el mail de confirmación.</p>}
    </>}
  </div></div></section>
}

export default function AccionPage() {
  return <Suspense fallback={<section className="accion"><div className="shell"><div className="accion-card"><CargaGemma mensaje="Un momento…" compacta /></div></div></section>}><Accion /></Suspense>
}
