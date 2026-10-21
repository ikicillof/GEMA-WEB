'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { esRol, type Permiso, type Rol } from '@/lib/roles'

export type ModoLogin = 'ingresar' | 'registro' | 'recuperar'

type Sesion = { user: User; rol: Rol; permisos: Permiso[] } | null

type AuthContext = {
  sesion: Sesion
  cargando: boolean
  modalAbierto: boolean
  modo: ModoLogin
  abrirLogin: (modo?: ModoLogin, destino?: string) => void
  /** fetch con la sesión (Authorization: Bearer) para las rutas del servidor que piden estar logueado. */
  llamar: (url: string, init?: RequestInit) => Promise<Response>
  cerrarLogin: () => void
  setModo: (modo: ModoLogin) => void
  /** `recibeNovedades` es la casilla del login: solo cuenta si es la primera vez (el servidor crea el perfil con ese valor). */
  ingresarConGoogle: (recibeNovedades: boolean) => Promise<void>
  /** El servidor dice que a esta persona (entró con Google sin tildar la casilla) todavía no se le preguntó por las novedades. */
  preguntaNovedades: boolean
  responderNovedades: (recibe: boolean) => Promise<void>
  ingresarConEmail: (email: string, password: string) => Promise<void>
  registrar: (datos: { nombre: string; email: string; password: string; recibeNovedades: boolean }) => Promise<void>
  reenviarVerificacion: (email: string, password: string) => Promise<void>
  recuperarPassword: (email: string) => Promise<void>
  cerrarSesion: () => Promise<void>
}

const Ctx = createContext<AuthContext | null>(null)

/** Error con un mensaje listo para mostrarle a la persona (nunca el texto crudo de Firebase). */
export class ErrorAuth extends Error {
  constructor(message: string, readonly codigo?: string) { super(message) }
}

function traducir(e: unknown): ErrorAuth {
  const codigo = (e as { code?: string })?.code ?? ''
  const mensajes: Record<string, string> = {
    'auth/invalid-credential': 'El email o la contraseña no son correctos.',
    'auth/wrong-password': 'El email o la contraseña no son correctos.',
    'auth/user-not-found': 'El email o la contraseña no son correctos.',
    'auth/invalid-email': 'Ese email no parece válido.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá ingresar o recuperar la contraseña.',
    'auth/weak-password': 'La contraseña es muy débil. Usá al menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
    'auth/network-request-failed': 'No hay conexión. Revisá tu internet y probá de nuevo.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Habilitá los pop-ups y probá de nuevo.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada. Escribinos para ayudarte.',
  }
  return new ErrorAuth(mensajes[codigo] ?? 'Algo salió mal. Probá de nuevo en un momento.', codigo)
}

/**
 * Pide al servidor que mande un mail de verificación o de recuperación (los manda nuestro backend por Resend, no Firebase).
 * `token` = ID token de la cuenta (solo para verificar); `cuerpo` = datos de la solicitud (solo para recuperar).
 */
async function pedirMail(url: string, opciones: { token?: string; cuerpo?: object } = {}): Promise<void> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}) },
      body: JSON.stringify(opciones.cuerpo ?? {}),
    })
  } catch {
    throw new ErrorAuth('No hay conexión. Revisá tu internet y probá de nuevo.')
  }
  if (res.ok) return
  const datos = await res.json().catch(() => ({})) as { error?: unknown }
  throw new ErrorAuth(typeof datos.error === 'string' ? datos.error : 'No pudimos mandar el mail. Probá de nuevo en un momento.', 'auth/mail')
}

// Las credenciales de email y contraseña requieren email verificado; Google ya viene verificado.
const requiereVerificar = (u: User) =>
  !u.emailVerified && u.providerData.length > 0 && u.providerData.every(p => p.providerId === 'password')

async function sincronizar(user: User, cuerpo?: { nombre?: string; recibeNovedades?: boolean }): Promise<{ preguntarNovedades: boolean }> {
  const token = await user.getIdToken()
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  if (!res.ok) throw new Error(`sync ${res.status}`)
  const datos = await res.json().catch(() => ({}))
  return { preguntarNovedades: datos?.preguntarNovedades === true }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>(null)
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modo, setModo] = useState<ModoLogin>('ingresar')
  const [preguntaNovedades, setPreguntaNovedades] = useState(false)
  // Lo que se eligió en la casilla del login justo antes de abrir Google; se manda una sola vez al sincronizar.
  const eleccionGoogle = useRef<boolean | null>(null)
  const router = useRouter()
  // A dónde seguir después de ingresar (ej. el checkout). Sobrevive a un recargo de página.
  const destino = useRef<string | null>(null)

  useEffect(() => onAuthStateChanged(auth, async user => {
    // Mientras no verifique su email, la cuenta no cuenta como sesión iniciada.
    if (!user || requiereVerificar(user)) { setSesion(null); setPreguntaNovedades(false); setCargando(false); return }
    try {
      const eleccion = eleccionGoogle.current
      eleccionGoogle.current = null
      const { preguntarNovedades } = await sincronizar(user, eleccion === null ? undefined : { recibeNovedades: eleccion })
      setPreguntaNovedades(preguntarNovedades)
      // Renueva el token para recibir el rol que el servidor acaba de dejar en los claims.
      const { claims } = await user.getIdTokenResult(true)
      const rol: Rol = esRol(claims.rol) ? claims.rol : 'cliente'
      setSesion({ user, rol, permisos: Array.isArray(claims.permisos) ? (claims.permisos as Permiso[]) : [] })
    } catch {
      // Sin confirmación del servidor no dejamos una sesión a medias.
      await signOut(auth)
      setSesion(null)
    }
    setCargando(false)
  }), [])

  useEffect(() => { try { destino.current = window.sessionStorage.getItem('gemma-post-login') } catch {} }, [])
  useEffect(() => {
    if (!sesion || !destino.current) return
    const ir = destino.current
    destino.current = null
    try { window.sessionStorage.removeItem('gemma-post-login') } catch {}
    router.push(ir)
  }, [sesion, router])

  const abrirLogin = useCallback((m: ModoLogin = 'ingresar', ir?: string) => {
    if (ir && ir.startsWith('/') && !ir.startsWith('//')) { destino.current = ir; try { window.sessionStorage.setItem('gemma-post-login', ir) } catch {} }
    setModo(m); setModalAbierto(true)
  }, [])
  const userActual = sesion?.user ?? null
  const llamar = useCallback(async (url: string, init: RequestInit = {}) => {
    if (!userActual) throw new Error('Sin sesión')
    const token = await userActual.getIdToken()
    return fetch(url, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers, Authorization: `Bearer ${token}` } })
  }, [userActual])
  const cerrarLogin = useCallback(() => setModalAbierto(false), [])

  const ingresarConGoogle = useCallback(async (recibeNovedades: boolean) => {
    eleccionGoogle.current = recibeNovedades
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setModalAbierto(false)
    } catch (e) {
      eleccionGoogle.current = null
      const codigo = (e as { code?: string }).code
      if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return
      throw traducir(e)
    }
  }, [])

  const ingresarConEmail = useCallback(async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      if (requiereVerificar(user)) {
        await signOut(auth)
        throw new ErrorAuth('Todavía no verificaste tu email. Revisá tu bandeja (y el spam) y hacé clic en el enlace.', 'no-verificado')
      }
      setModalAbierto(false)
    } catch (e) {
      throw e instanceof ErrorAuth ? e : traducir(e)
    }
  }, [])

  const registrar = useCallback(async ({ nombre, email, password, recibeNovedades }: { nombre: string; email: string; password: string; recibeNovedades: boolean }) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(user, { displayName: nombre.trim() })
      // El mail «Confirmá tu email» lo manda nuestro servidor por Resend. Si falla, la cuenta igual queda creada: se avisa al final.
      let errorMail: ErrorAuth | null = null
      try { await pedirMail('/api/auth/enviar-verificacion', { token: await user.getIdToken() }) } catch (e) { errorMail = e instanceof ErrorAuth ? e : traducir(e) }
      // El perfil (y la preferencia de novedades) se crea en el servidor; el rol arranca en "cliente".
      await sincronizar(user, { nombre: nombre.trim(), recibeNovedades })
      await signOut(auth)
      if (errorMail) throw new ErrorAuth(`Creamos tu cuenta, pero no pudimos mandarte el mail para confirmar tu email. ${errorMail.message} Cuando puedas, ingresá y te ofrecemos pedir otro.`)
    } catch (e) {
      throw e instanceof ErrorAuth ? e : traducir(e)
    }
  }, [])

  const reenviarVerificacion = useCallback(async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      try {
        if (requiereVerificar(user)) await pedirMail('/api/auth/enviar-verificacion', { token: await user.getIdToken() })
      } finally {
        await signOut(auth)
      }
    } catch (e) {
      throw e instanceof ErrorAuth ? e : traducir(e)
    }
  }, [])

  const recuperarPassword = useCallback(async (email: string) => {
    try {
      // El servidor responde siempre lo mismo (exista o no la cuenta) y manda el mail por Resend solo si corresponde.
      await pedirMail('/api/auth/recuperar-contrasena', { cuerpo: { email: email.trim() } })
    } catch (e) {
      throw e instanceof ErrorAuth ? e : traducir(e)
    }
  }, [])

  const cerrarSesion = useCallback(async () => { await signOut(auth) }, [])

  /** Cualquier respuesta (sí o no) queda guardada en el perfil desde el servidor: no se vuelve a preguntar. */
  const responderNovedades = useCallback(async (recibe: boolean) => {
    const r = await llamar('/api/cuenta/novedades', { method: 'POST', body: JSON.stringify({ recibe }) })
    if (!r.ok) throw new Error('No pudimos guardar tu respuesta')
    setPreguntaNovedades(false)
  }, [llamar])

  const valor = useMemo<AuthContext>(() => ({
    sesion, cargando, modalAbierto, modo, abrirLogin, llamar, cerrarLogin, setModo, ingresarConGoogle, ingresarConEmail,
    registrar, reenviarVerificacion, recuperarPassword, cerrarSesion, preguntaNovedades, responderNovedades,
  }), [sesion, cargando, modalAbierto, modo, abrirLogin, llamar, cerrarLogin, ingresarConGoogle, ingresarConEmail, registrar, reenviarVerificacion, recuperarPassword, cerrarSesion, preguntaNovedades, responderNovedades])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
