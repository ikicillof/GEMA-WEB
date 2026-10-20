import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { enviarMailsArrepentimiento, ESTADOS_ARREPENTIMIENTO, TRAMITE_VALIDO } from '@/lib/server/arrepentimiento'
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

/** Reintenta los mails de esta solicitud que fallaron. Solo admin o creador. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'arrepentimiento-mails', minRol: 'admin', maxPorMinuto: 10 })
  if ('error' in r) return r.error
  if (!TRAMITE_VALIDO.test(params.id)) return json({ error: 'No encontramos esa solicitud' }, 404)
  try {
    const ref = adminDb().collection('arrepentimientos').doc(params.id)
    const snap = await ref.get()
    if (!snap.exists) return json({ error: 'No encontramos esa solicitud' }, 404)
    const emails = (snap.get('emails') ?? {}) as Record<string, { estado?: string }>
    const cuales = (['duena', 'cliente'] as const).filter(c => emails[c]?.estado !== 'enviado')
    if (cuales.length) await enviarMailsArrepentimiento(params.id, [...cuales])
    const despues = await ref.get()
    const pendientes = despues.get('mailsPendientes') === true
    await auditar(r.staff, 'arrepentimiento-mails', { tramite: params.id, reintentados: cuales.length, siguenFallando: pendientes })
    return json({ reintentados: cuales.length, mailsPendientes: pendientes })
  } catch (e) {
    console.error('[admin/arrepentimientos] reintentar', (e as Error).message)
    return json({ error: 'No pudimos reintentar los mails' }, 500)
  }
}
