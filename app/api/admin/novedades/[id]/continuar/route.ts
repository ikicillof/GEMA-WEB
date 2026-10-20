import { adminDb } from '@/lib/firebase/admin'
import { auditar, exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { dispararEnvio } from '@/lib/server/novedades-admin'
import { ID_CAMPANA } from '@/lib/server/novedades-schemas'

export const dynamic = 'force-dynamic'

/** Vuelve a despertar el envío de una campaña que quedó en cola (por el cupo diario o un corte). Solo admin o creador. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await exigirStaff(req, { ruta: 'novedades-continuar', minRol: 'admin', maxPorMinuto: 10 })
  if ('error' in r) return r.error
  if (!ID_CAMPANA.test(params.id)) return json({ error: 'No encontramos ese envío' }, 404)
  try {
    const snap = await adminDb().collection('novedades').doc(params.id).get()
    if (!snap.exists) return json({ error: 'No encontramos ese envío' }, 404)
    const x = snap.data()!
    if (x.estado !== 'en_cola' && x.estado !== 'enviando') return json({ error: 'Este envío ya terminó' }, 409)
    const pendientes = (Number(x.total) || 0) - (Number(x.enviados) || 0) - (Number(x.fallidos) || 0) - (Number(x.omitidos) || 0)
    if (pendientes <= 0) return json({ error: 'No quedan mails pendientes' }, 409)
    if (x.estado === 'enviando' && Number(x.bloqueadoHasta) > Date.now()) return json({ error: 'Ya se está enviando. Esperá unos minutos.' }, 409)
    const disparado = await dispararEnvio()
    await auditar(r.staff, 'novedad-continuar', { id: params.id })
    return json({ disparado })
  } catch (e) {
    console.error('[admin/novedades] continuar', (e as Error).message)
    return json({ error: 'No pudimos continuar el envío' }, 500)
  }
}
