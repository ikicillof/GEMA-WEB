import { z } from 'zod'
import { adminAuth } from '@/lib/firebase/admin'
import { json } from '@/lib/server/auth'
import { limitarEnvio, mandarMailAuth, MENSAJE_LIMITE } from '@/lib/server/auth-mails'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const Cuerpo = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict()

/** Respuesta ÚNICA para cualquier email válido: no revela si la cuenta existe. */
const MENSAJE_GENERICO = 'Si hay una cuenta con ese email, te mandamos un enlace para elegir una contraseña nueva. Revisá tu bandeja (y el spam).'

/**
 * Manda el mail «Cambiá tu contraseña» por Resend. Pública (no hay sesión: se perdió la contraseña).
 * - Siempre responde lo mismo, exista o no la cuenta (y aunque falle el envío: el error queda solo en el log del servidor).
 * - No manda nada si la cuenta no existe o es solo de Google (sin contraseña).
 * - Límite de 3 por email por hora y por IP, guardado en Firestore. Se cuenta antes de buscar la cuenta, así el "demasiados intentos"
 *   tampoco revela si el email está registrado.
 */
export async function POST(req: Request) {
  const ip = ipDe(req)
  if (!limitar(`recuperar:${ip}`, 20)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)

  const parsed = Cuerpo.safeParse(await req.json().catch(() => undefined))
  if (!parsed.success) return json({ error: 'Escribí un email válido.' }, 400)
  const { email } = parsed.data

  try {
    if ((await limitarEnvio('recuperacion', email, ip)) !== 'ok') return json({ error: MENSAJE_LIMITE }, 429)
  } catch (e) {
    console.error('[auth/recuperar] límite', (e as Error).message)
    return json({ error: 'No pudimos procesar el pedido en este momento. Probá de nuevo en unos minutos.' }, 503)
  }

  try {
    const user = await adminAuth().getUserByEmail(email)
    // Solo las cuentas con contraseña pueden cambiarla; las de Google no tienen nada que recuperar.
    if (user.providerData.some(p => p.providerId === 'password') && !user.disabled) await mandarMailAuth('recuperacion', email, user.displayName ?? '')
  } catch (e) {
    // auth/user-not-found es lo esperado para un email sin cuenta. Cualquier otro fallo (Resend, límite de Firebase) también
    // devuelve el mensaje genérico para no filtrar nada; queda en el log.
    if ((e as { code?: string }).code !== 'auth/user-not-found') console.error('[auth/recuperar]', (e as Error).message)
  }
  return json({ ok: true, mensaje: MENSAJE_GENERICO })
}
