'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User,
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
  abrirLogin: (modo?: ModoLogin) => void
  cerrarLogin: () => void
  setModo: (modo: ModoLogin) => void
  ingresarConGoogle: () => Promise<void>
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

// Las credenciales de email y contraseña requieren email verificado; Google ya viene verificado.
const requiereVerificar = (u: User) =>
  !u.emailVerified && u.providerData.length > 0 && u.providerData.every(p => p.providerId === 'password')

async function sincronizar(user: User, cuerpo?: { nombre?: string; recibeNovedades?: boolean }) {
  const token = await user.getIdToken()
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  if (!res.ok) throw new Error(`sync ${res.status}`)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>(null)
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modo, setModo] = useState<ModoLogin>('ingresar')

  useEffect(() => onAuthStateChanged(auth, async user => {
    // Mientras no verifique su email, la cuenta no cuenta como sesión iniciada.
    if (!user || requiereVerificar(user)) { setSesion(null); setCargando(false); return }
    try {
      await sincronizar(user)
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

  const abrirLogin = useCallback((m: ModoLogin = 'ingresar') => { setModo(m); setModalAbierto(true) }, [])
  const cerrarLogin = useCallback(() => setModalAbierto(false), [])

  const ingresarConGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setModalAbierto(false)
    } catch (e) {
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
      await sendEmailVerification(user)
      // El perfil (y la preferencia de novedades) se crea en el servidor; el rol arranca en "cliente".
      await sincronizar(user, { nombre: nombre.trim(), recibeNovedades })
      await signOut(auth)
    } catch (e) {
      throw traducir(e)
    }
  }, [])

  const reenviarVerificacion = useCallback(async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      if (requiereVerificar(user)) await sendEmailVerification(user)
      await signOut(auth)
    } catch (e) {
      throw traducir(e)
    }
  }, [])

  const recuperarPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (e) {
      // No revelamos si el email existe o no.
      const codigo = (e as { code?: string }).code
      if (codigo === 'auth/user-not-found') return
      throw traducir(e)
    }
  }, [])

  const cerrarSesion = useCallback(async () => { await signOut(auth) }, [])

  const valor = useMemo<AuthContext>(() => ({
    sesion, cargando, modalAbierto, modo, abrirLogin, cerrarLogin, setModo, ingresarConGoogle, ingresarConEmail,
    registrar, reenviarVerificacion, recuperarPassword, cerrarSesion,
  }), [sesion, cargando, modalAbierto, modo, abrirLogin, cerrarLogin, ingresarConGoogle, ingresarConEmail, registrar, reenviarVerificacion, recuperarPassword, cerrarSesion])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
