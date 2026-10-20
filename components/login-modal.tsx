'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, MailCheck, X } from 'lucide-react'
import { ErrorAuth, useAuth, type ModoLogin } from './auth-provider'
import { CargaGemma } from './carga-gemma'
import { GemmaStar } from './gemma-ornament'

const TITULOS: Record<ModoLogin, { kicker: string; titulo: string }> = {
  ingresar: { kicker: 'Tu cuenta', titulo: 'Ingresar' },
  registro: { kicker: 'Sumate a Gemma', titulo: 'Crear cuenta' },
  recuperar: { kicker: 'Sin drama', titulo: 'Recuperar contraseña' },
}

// Aviso final después de registrarse / pedir el enlace de recuperación.
type Aviso = { titulo: string; texto: string } | null

export function LoginModal() {
  const { modalAbierto, modo, setModo, cerrarLogin, ingresarConGoogle, ingresarConEmail, registrar, reenviarVerificacion, recuperarPassword } = useAuth()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [novedades, setNovedades] = useState(false) // destildada por defecto
  const [error, setError] = useState<ErrorAuth | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [enviando, setEnviando] = useState(false)
  const [reenviado, setReenviado] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Al abrir o cambiar de pestaña se limpia el estado de la anterior (el email se conserva).
  useEffect(() => { setError(null); setAviso(null); setPassword(''); setReenviado(false) }, [modo, modalAbierto])
  // Cada vez que se abre el login la casilla vuelve a estar destildada.
  useEffect(() => { if (modalAbierto) setNovedades(false) }, [modalAbierto])

  useEffect(() => {
    if (!modalAbierto) return
    const previo = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarLogin()
      if (e.key !== 'Tab' || !dialogRef.current) return
      // Foco atrapado dentro del modal.
      const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]')
      if (!items.length) return
      const primero = items[0], ultimo = items[items.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', alTeclear)
    return () => { document.removeEventListener('keydown', alTeclear); previo?.focus() }
  }, [modalAbierto, cerrarLogin])

  if (!modalAbierto) return null

  const correr = async (accion: () => Promise<void>) => {
    setError(null); setEnviando(true)
    try { await accion() } catch (e) { setError(e instanceof ErrorAuth ? e : new ErrorAuth('Algo salió mal. Probá de nuevo en un momento.')) }
    setEnviando(false)
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (modo === 'registro' && password.length < 8) { setError(new ErrorAuth('La contraseña tiene que tener al menos 8 caracteres.')); return }
    void correr(async () => {
      if (modo === 'ingresar') await ingresarConEmail(email, password)
      else if (modo === 'registro') {
        await registrar({ nombre, email, password, recibeNovedades: novedades })
        setAviso({ titulo: '¡Casi listo!', texto: `Te enviamos un email a ${email.trim()} para verificar tu cuenta. Hacé clic en el enlace y después ingresá. Si no lo ves, revisá el spam.` })
      } else {
        await recuperarPassword(email)
        setAviso({ titulo: 'Revisá tu email', texto: 'Si hay una cuenta con ese email, te mandamos un enlace para elegir una contraseña nueva.' })
      }
    })
  }

  return <>
    <button type="button" className="drawer-backdrop auth-backdrop" aria-label="Cerrar" onClick={cerrarLogin} />
    <div ref={dialogRef} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-titulo" data-lenis-prevent>
      <button type="button" className="icon-button auth-close" onClick={cerrarLogin} aria-label="Cerrar"><X size={20} /></button>
      {aviso ? <div className="auth-aviso">
        <div className="auth-aviso-icon" aria-hidden="true"><MailCheck size={28} /></div>
        <h2 id="auth-titulo" className="auth-title">{aviso.titulo}</h2>
        <p>{aviso.texto}</p>
        <button type="button" className="button button--dark" onClick={() => { setAviso(null); setModo('ingresar') }}>Ir a ingresar</button>
      </div> : <>
        <p className="eyebrow">{TITULOS[modo].kicker}</p>
        <h2 id="auth-titulo" className="auth-title">{TITULOS[modo].titulo} <GemmaStar size={14} /></h2>

        {modo !== 'recuperar' && <>
          {/* La casilla está arriba de las dos opciones (Google y email): vale para cualquiera de las dos. Siempre destildada al abrir. */}
          <label className="auth-check auth-check--novedades"><input type="checkbox" checked={novedades} onChange={e => setNovedades(e.target.checked)} /><span>Quiero recibir novedades de Gemma por email</span></label>
          {modo === 'ingresar' && <p className="auth-nota">Solo cuenta si es tu primera vez en Gemma. Si ya tenés cuenta, lo cambiás en «Mi cuenta».</p>}
          <button type="button" className="auth-google" disabled={enviando} onClick={() => correr(() => ingresarConGoogle(novedades))}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.7l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
            Continuar con Google
          </button>
          <div className="auth-sep"><span>o con tu email</span></div>
        </>}

        <form onSubmit={enviar} className="auth-form">
          {modo === 'registro' && <label>Nombre<input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={80} autoComplete="name" /></label>}
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" /></label>
          {modo !== 'recuperar' && <label>Contraseña<span className="auth-pass"><input type={verPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={modo === 'registro' ? 8 : undefined} maxLength={128} autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} /><button type="button" className="auth-pass-ojo" onClick={() => setVerPassword(v => !v)} aria-label={verPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'} aria-pressed={verPassword}>{verPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span>{modo === 'registro' && <small>Al menos 8 caracteres.</small>}</label>}

          {error && <p className="auth-error" role="alert">{error.message}{error.codigo === 'no-verificado' && !reenviado && <> <button type="button" className="auth-link" onClick={() => correr(async () => { await reenviarVerificacion(email, password); setReenviado(true) })}>Reenviar email</button></>}</p>}
          {reenviado && <p className="auth-ok" role="status">Listo, te mandamos otro email de verificación.</p>}

          <button type="submit" className="button button--pink auth-submit" disabled={enviando}>{modo === 'ingresar' ? 'Ingresar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}</button>
          <CargaGemma compacta activa={enviando} mensaje={modo === 'ingresar' ? 'Ingresando a tu cuenta…' : modo === 'registro' ? 'Creando tu cuenta…' : 'Enviando el enlace…'} />
        </form>

        <div className="auth-links">
          {modo === 'ingresar' && <><button type="button" className="auth-link" onClick={() => setModo('recuperar')}>Olvidé mi contraseña</button><button type="button" className="auth-link" onClick={() => setModo('registro')}>Crear una cuenta</button></>}
          {modo === 'registro' && <button type="button" className="auth-link" onClick={() => setModo('ingresar')}>Ya tengo cuenta</button>}
          {modo === 'recuperar' && <button type="button" className="auth-link" onClick={() => setModo('ingresar')}>Volver a ingresar</button>}
        </div>
      </>}
    </div>
  </>
}
