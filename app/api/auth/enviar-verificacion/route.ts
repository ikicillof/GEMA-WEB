import { adminAuth } from '@/lib/firebase/admin'
import { json, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { esDemasiadosIntentos, limitarEnvio, mandarMailAuth, MENSAJE_LIMITE } from '@/lib/server/auth-mails'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Manda (o reenvía) el mail «Confirmá tu email» por Resend.
 * - Requiere sesión: se verifica el ID token (el de una cuenta SIN verificar también vale: justamente la necesita).
 * - El mail va SIEMPRE al email de la cuenta del token. Esta ruta no lee el cuerpo: no hay forma de mandarlo a otra dirección.
 * - Si el email ya está verificado, no manda nada.
 */
export async function POST(req: Request) {
  const ip = ipDe(req)
  if (!limitar(`enviar-verificacion:${ip}`, 20)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)

  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return json({ error: 'No autorizado' }, 401)

  try {
    const user = await adminAuth().getUser(decoded.uid)
    if (user.emailVerified) return json({ ok: true, yaVerificado: true })
    if (!user.email) return json({ error: 'Tu cuenta no tiene un email para verificar.' }, 400)

    if ((await limitarEnvio('verificacion', user.email, ip)) !== 'ok') return json({ error: MENSAJE_LIMITE }, 429)
    await mandarMailAuth('verificacion', user.email, user.displayName ?? '')
    return json({ ok: true })
  } catch (e) {
    if (esDemasiadosIntentos(e)) return json({ error: MENSAJE_LIMITE }, 429)
    console.error('[auth/enviar-verificacion]', (e as Error).message)
    return json({ error: 'No pudimos mandar el mail en este momento. Probá de nuevo en unos minutos.' }, 502)
  }
}
