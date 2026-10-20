import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Token del link «Darme de baja»: `uid.firma`. La firma es un HMAC-SHA256 del uid con NOVEDADES_TOKEN_SECRET, así que nadie puede
// armar el link de otra persona sin el secreto. No vence a propósito: un link de baja tiene que funcionar siempre.
// El mismo algoritmo vive en netlify/lib/novedades-core.mjs (la función que envía); si cambia uno, cambia el otro.

export const UID_VALIDO = /^[A-Za-z0-9_-]{1,128}$/

function secreto(): string {
  const s = process.env.NOVEDADES_TOKEN_SECRET?.trim()
  if (!s || s.length < 32) throw new Error('NOVEDADES_TOKEN_SECRET sin configurar (mínimo 32 caracteres)')
  return s
}
const firma = (uid: string) => createHmac('sha256', secreto()).update(`baja:${uid}`).digest('base64url')

export const firmarBaja = (uid: string) => `${uid}.${firma(uid)}`

/** uid de la persona si el token es auténtico; null si no. Compara en tiempo constante. */
export function verificarBaja(token: string): string | null {
  const i = token.lastIndexOf('.')
  if (i < 1 || token.length > 300) return null
  const uid = token.slice(0, i)
  if (!UID_VALIDO.test(uid)) return null
  const a = Buffer.from(token.slice(i + 1))
  const b = Buffer.from(firma(uid))
  return a.length === b.length && timingSafeEqual(a, b) ? uid : null
}
