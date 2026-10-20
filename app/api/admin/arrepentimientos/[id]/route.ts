import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { campoMail, CUALES_MAIL, enviarMailArrepentimiento, ESTADOS_ARREPENTIMIENTO, TRAMITE_VALIDO, type EstadoMail } from '@/lib/server/arrepentimiento'
import { json } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const CambioSchema = z.object({ estado: z.enum(ESTADOS_ARREPENTIMIENTO) }).strict()

/** Cambia el estado de la solicitud (recibido, en gestión, resuelto). Solo admin o creador. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'arrepentimiento-estado', minRol: 'admin', maxPorMinuto: 30 })
  if ('error' in r) return r.error
  if (!TRAMITE_VALIDO.test(params.id)) return json({ error: 'No encontramos esa solicitud' }, 404)
  const parsed = CambioSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  try {
    const ref = adminDb().collection('arrepentimientos').doc(params.id)
    const snap = await ref.get()
    if (!snap.exists) return json({ error: 'No encontramos esa solicitud' }, 404)
    const antes = String(snap.get('estado') ?? 'recibido')
    await ref.update({ estado: parsed.data.estado })
    await auditar(r.staff, 'arrepentimiento-estado', { tramite: params.id, de: antes, a: parsed.data.estado })
    return json({ ok: true, estado: parsed.data.estado })
  } catch (e) {
    console.error('[admin/arrepentimientos] estado', (e as Error).message)
    return json({ error: 'No pudimos cambiar el estado' }, 500)
  }
}

const ReintentoSchema = z.object({ cual: z.enum(CUALES_MAIL) }).strict()

/** Reintenta UNO de los dos mails de la solicitud (`cual`: 'cliente' o 'duena'), con su propia plantilla y su propio destinatario. Solo admin o creador. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'arrepentimiento-mails', minRol: 'admin', maxPorMinuto: 10 })
  if ('error' in r) return r.error
  if (!TRAMITE_VALIDO.test(params.id)) return json({ error: 'No encontramos esa solicitud' }, 404)
  const parsed = ReintentoSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Indicá qué mail reintentar (cliente o duena)' }, 400)
  try {
    const previo = await adminDb().collection('arrepentimientos').doc(params.id).get()
    if (!previo.exists) return json({ error: 'No encontramos esa solicitud' }, 404)
    if ((previo.get(campoMail(parsed.data.cual)) as EstadoMail | undefined)?.estado === 'enviado') return json({ error: 'Ese mail ya se envió' }, 409)
    const resultado = await enviarMailArrepentimiento(params.id, parsed.data.cual)
    await auditar(r.staff, 'arrepentimiento-mail', { tramite: params.id, cual: parsed.data.cual, resultado: resultado?.estado ?? 'sin-datos' })
    return json({ cual: parsed.data.cual, estado: resultado?.estado ?? 'error', error: resultado?.estado === 'error' ? resultado.error ?? null : null })
  } catch (e) {
    console.error('[admin/arrepentimientos] reintentar', (e as Error).message)
    return json({ error: 'No pudimos reintentar los mails' }, 500)
  }
}
