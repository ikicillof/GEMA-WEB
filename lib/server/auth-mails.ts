import 'server-only'
import { createHash } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import CambiarContrasena from '@/emails/cambiar-contrasena'
import ConfirmarEmail from '@/emails/confirmar-email'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { emailDeRespuestas, mandar } from '@/lib/mail-core'
import { contarEnvios } from '@/lib/server/novedades-admin'
import { urlDelSitio } from '@/lib/seo'

// Mails de verificación de email y de recuperar contraseña: los manda NUESTRO backend por Resend (con el diseño de Gemma, desde
// RESEND_FROM_EMAIL y con reply-to RESEND_REPLY_TO) en vez de los mails genéricos de Firebase. El link lo genera firebase-admin y se
// reescribe a {SITE_URL}/auth/accion?mode=…&oobCode=…, que lo consume el SDK de Firebase en el navegador (app/auth/accion).

export type TipoMailAuth = 'verificacion' | 'recuperacion'

export const MAX_POR_EMAIL_POR_HORA = 3
export const MAX_POR_IP_POR_HORA = 10
const HORA_MS = 60 * 60 * 1000

/** Se guarda solo un hash: en `limitesAuth` no quedan emails ni IPs en claro. */
const idDe = (clave: string) => createHash('sha256').update(clave).digest('hex').slice(0, 40)

/** Suma un intento al contador (ventana de 1 hora). false = ya se llegó al máximo. Transaccional: dos pedidos a la vez no se cuelan. */
async function sumar(id: string, max: number): Promise<boolean> {
  const ref = adminDb().collection('limitesAuth').doc(id)
  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref)
    const ahora = Date.now()
    const desde = snap.get('desde') instanceof Timestamp ? (snap.get('desde') as Timestamp).toMillis() : 0
    if (!snap.exists || ahora - desde >= HORA_MS) {
      // `expira` sirve para una política TTL de Firestore (borra solo los contadores viejos); no cambia cómo funciona el límite.
      tx.set(ref, { desde: Timestamp.fromMillis(ahora), cuenta: 1, expira: Timestamp.fromMillis(ahora + 2 * HORA_MS) })
      return true
    }
    if ((snap.get('cuenta') as number) >= max) return false
    tx.update(ref, { cuenta: FieldValue.increment(1) })
    return true
  })
}

/**
 * Límite de envíos: primero por IP y después por email (3 por hora y por tipo de mail). Cuenta SIEMPRE, exista o no la cuenta,
 * así la respuesta de "demasiados intentos" no revela si un email está registrado.
 */
export async function limitarEnvio(tipo: TipoMailAuth, email: string, ip: string): Promise<'ok' | 'ip' | 'email'> {
  if (!(await sumar(idDe(`ip:${tipo}:${ip}`), MAX_POR_IP_POR_HORA))) return 'ip'
  if (!(await sumar(idDe(`email:${tipo}:${email.trim().toLowerCase()}`), MAX_POR_EMAIL_POR_HORA))) return 'email'
  return 'ok'
}

/** Firebase corta los envíos repetidos con TOO_MANY_ATTEMPTS_TRY_LATER. */
export const esDemasiadosIntentos = (e: unknown) => /TOO_MANY_ATTEMPTS_TRY_LATER|too-many-requests/i.test(`${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`)

export const MENSAJE_LIMITE = 'Ya te mandamos varios mails en la última hora. Esperá un rato y revisá tu bandeja (y el spam) antes de pedir otro.'

/** Genera el link de Firebase, lo reescribe a nuestra página y manda el mail por Resend. Lanza si algo falla. */
export async function mandarMailAuth(tipo: TipoMailAuth, email: string, nombre: string): Promise<void> {
  const auth = adminAuth()
  const link = tipo === 'verificacion' ? await auth.generateEmailVerificationLink(email) : await auth.generatePasswordResetLink(email)
  const origen = new URL(link)
  const mode = origen.searchParams.get('mode')
  const oobCode = origen.searchParams.get('oobCode')
  const esperado = tipo === 'verificacion' ? 'verifyEmail' : 'resetPassword'
  if (!oobCode || mode !== esperado) throw new Error('Firebase no devolvió un enlace válido')
  const url = `${urlDelSitio()}/auth/accion?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`
  const nombreCorto = nombre.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().split(/\s+/)[0]?.slice(0, 40) ?? ''
  await mandar({
    para: email,
    asunto: tipo === 'verificacion' ? 'Confirmá tu email en Gemma' : 'Cambiá tu contraseña de Gemma',
    reply: emailDeRespuestas(),
    react: tipo === 'verificacion' ? ConfirmarEmail({ nombre: nombreCorto, url }) : CambiarContrasena({ nombre: nombreCorto, url }),
  })
  // Comparte el límite diario de Resend con los demás mails; si no se puede contar, el mail ya salió.
  await contarEnvios(1).catch(() => undefined)
}
