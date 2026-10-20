import 'server-only'
import { render } from '@react-email/render'
import { FieldValue } from 'firebase-admin/firestore'
import Novedades from '@/emails/novedades'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { parsearMensaje } from '@/lib/novedades-formato'

// Lo común de las novedades del lado de la web. El envío masivo en sí lo hace la función de fondo (netlify/functions).

export const MARCA_BAJA = '__BAJA_URL__'
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export type DatosNovedad = { asunto: string; mensaje: string; imagen: string | null }

export const sitio = () => (process.env.SITE_URL?.trim() ?? '').replace(/\/+$/, '')
export const conBaja = (texto: string, url: string) => texto.split(MARCA_BAJA).join(url)
export const diaUtc = (f = new Date()) => f.toISOString().slice(0, 10)

/** Cloudinary: la imagen se achica para el mail (sin cambiar el formato, porque no todos los clientes de mail leen webp/avif). */
const imagenParaMail = (url: string) => url.replace('/image/upload/', '/image/upload/c_limit,w_1040,q_auto/')

/**
 * Límite diario del plan de Resend (100 por día en el gratuito) y cuántos se reservan para los mails de venta.
 * Las novedades solo usan lo que sobra: nunca le sacan lugar al aviso de una venta o a la confirmación de un cliente.
 */
export function limites() {
  const limite = Math.floor(Number(process.env.RESEND_LIMITE_DIARIO))
  const reserva = Math.floor(Number(process.env.NOVEDADES_RESERVA_VENTAS))
  return { limite: limite > 0 ? limite : 100, reserva: reserva >= 0 ? reserva : 20 }
}

export async function cupoDeHoy() {
  const { limite, reserva } = limites()
  const usados = Number((await adminDb().doc(`mailsDiarios/${diaUtc()}`).get()).get('enviados')) || 0
  return { usados, limite, reserva, disponibles: Math.max(0, limite - reserva - usados) }
}

/** Suma al contador del día (lo usan las novedades y los mails de venta, que comparten el límite de Resend). */
export async function contarEnvios(n: number): Promise<void> {
  if (n <= 0) return
  await adminDb().doc(`mailsDiarios/${diaUtc()}`).set({ enviados: FieldValue.increment(n), actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
}

/**
 * A quiénes se les puede mandar HOY: perfiles con recibeNovedades en true Y email verificado en Firebase Auth
 * (sin verificar, alguien podría haber registrado el email de otra persona y recibiría publicidad que nunca pidió).
 */
export async function destinatariosVigentes(): Promise<{ uid: string; email: string }[]> {
  const snap = await adminDb().collection('users').where('recibeNovedades', '==', true).get()
  const uids = snap.docs.map(d => d.id)
  const vistos = new Set<string>()
  const lista: { uid: string; email: string }[] = []
  for (let i = 0; i < uids.length; i += 100) {
    const { users } = await adminAuth().getUsers(uids.slice(i, i + 100).map(uid => ({ uid })))
    for (const u of users) {
      const email = (u.email ?? '').trim().toLowerCase()
      if (!u.emailVerified || !EMAIL.test(email) || vistos.has(email)) continue
      vistos.add(email)
      lista.push({ uid: u.uid, email })
    }
  }
  return lista
}

/** HTML y texto del mail con la marca __BAJA_URL__ donde va el link de baja de cada persona. */
export async function renderizar(d: DatosNovedad): Promise<{ html: string; texto: string }> {
  const elemento = Novedades({ asunto: d.asunto, parrafos: parsearMensaje(d.mensaje), imagen: d.imagen ? imagenParaMail(d.imagen) : null, urlBaja: MARCA_BAJA })
  const [html, texto] = await Promise.all([render(elemento), render(elemento, { plainText: true })])
  return { html, texto }
}

/** Despierta la función de fondo que manda las novedades. false = no se pudo (la campaña queda en cola y se puede continuar). */
export async function dispararEnvio(): Promise<boolean> {
  const url = sitio()
  const secreto = process.env.NOVEDADES_SECRET?.trim()
  if (!url || !secreto) return false
  try {
    const r = await fetch(`${url}/.netlify/functions/novedades-background`, { method: 'POST', headers: { 'x-novedades-secret': secreto }, signal: AbortSignal.timeout(8000) })
    return r.ok
  } catch (e) {
    console.error('[novedades] no se pudo despertar la función de envío:', (e as Error).message)
    return false
  }
}
