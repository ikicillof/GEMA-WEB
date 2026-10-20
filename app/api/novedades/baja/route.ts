import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { json } from '@/lib/server/auth'
import { verificarBaja } from '@/lib/server/novedades-token'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const Cuerpo = z.object({ t: z.string().max(300), accion: z.enum(['baja', 'alta']) }).strict()

/**
 * Baja (o «me equivoqué») SIN login: la autoriza el token firmado del mail. Dos formas de llamarla:
 *  - JSON { t, accion } desde la página de baja (para deshacer);
 *  - baja con un clic de Gmail/Apple Mail (RFC 8058): POST con `List-Unsubscribe=One-Click` y el token en `?t=`.
 */
export async function POST(req: Request) {
  if (!limitar(`baja:${ipDe(req)}`, 20)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)
  let token = new URL(req.url).searchParams.get('t') ?? ''
  let accion: 'baja' | 'alta' = 'baja'
  if ((req.headers.get('content-type') ?? '').includes('application/json')) {
    const parsed = Cuerpo.safeParse(await req.json().catch(() => undefined))
    if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
    token = parsed.data.t
    accion = parsed.data.accion
  }
  try {
    const uid = verificarBaja(token)
    if (!uid) return json({ error: 'El link no es válido' }, 400)
    const ref = adminDb().collection('users').doc(uid)
    if (!(await ref.get()).exists) return json({ error: 'El link no es válido' }, 400)
    await ref.update(accion === 'baja'
      ? { recibeNovedades: false, novedadesPreguntadas: true, novedadesBajaEn: FieldValue.serverTimestamp() }
      : { recibeNovedades: true, novedadesPreguntadas: true })
    return json({ ok: true, recibeNovedades: accion === 'alta' })
  } catch (e) {
    console.error('[novedades/baja]', (e as Error).message)
    return json({ error: 'No pudimos procesar la baja. Probá de nuevo.' }, 500)
  }
}
