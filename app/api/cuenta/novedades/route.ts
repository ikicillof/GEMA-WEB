import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { json, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const Cuerpo = z.object({ recibe: z.boolean() }).strict()

/** Quién llama: solo la propia persona, con su sesión. Si entró con email y contraseña, tiene que haber verificado el email. */
async function personaActual(req: Request) {
  if (!limitar(`cuenta-novedades:${ipDe(req)}`, 30)) return { error: json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429) }
  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return { error: json({ error: 'No autorizado' }, 401) }
  if (decoded.firebase?.sign_in_provider === 'password' && decoded.email_verified !== true) return { error: json({ error: 'Verificá tu email para continuar' }, 403) }
  return { uid: decoded.uid }
}

/** ¿La persona quiere recibir novedades? (para «Mi cuenta») */
export async function GET(req: Request) {
  const p = await personaActual(req)
  if ('error' in p) return p.error
  try {
    const snap = await adminDb().collection('users').doc(p.uid).get()
    if (!snap.exists) return json({ error: 'No encontramos tu perfil' }, 404)
    return json({ recibeNovedades: snap.get('recibeNovedades') === true })
  } catch (e) {
    console.error('[cuenta/novedades] leer', (e as Error).message)
    return json({ error: 'No pudimos cargar tu preferencia' }, 500)
  }
}

/** Activa o desactiva las novedades. Cualquier respuesta (también «No, gracias») marca que ya se le preguntó. */
export async function POST(req: Request) {
  const p = await personaActual(req)
  if ('error' in p) return p.error
  const parsed = Cuerpo.safeParse(await req.json().catch(() => undefined))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  try {
    const ref = adminDb().collection('users').doc(p.uid)
    if (!(await ref.get()).exists) return json({ error: 'No encontramos tu perfil' }, 404)
    await ref.update({ recibeNovedades: parsed.data.recibe, novedadesPreguntadas: true })
    return json({ recibeNovedades: parsed.data.recibe })
  } catch (e) {
    console.error('[cuenta/novedades] guardar', (e as Error).message)
    return json({ error: 'No pudimos guardar tu preferencia' }, 500)
  }
}
