import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { cupoDeHoy, destinatariosVigentes, dispararEnvio, renderizar } from '@/lib/server/novedades-admin'
import { NovedadSchema } from '@/lib/server/novedades-schemas'

export const dynamic = 'force-dynamic'

const campanas = () => adminDb().collection('novedades')
const ACTIVAS = ['preparando', 'en_cola', 'enviando']
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : null)

/** Historial de envíos (más nuevos primero), cuántas personas están suscriptas y cuánto cupo diario queda. Solo admin o creador. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'novedades', minRol: 'admin', maxPorMinuto: 60 })
  if ('error' in r) return r.error
  // ?liviano=1 evita recalcular los suscriptos (que consulta Firebase Auth): lo usa la actualización automática del panel.
  const liviano = new URL(req.url).searchParams.get('liviano') === '1'
  try {
    const [snap, suscriptos, cupo] = await Promise.all([
      campanas().orderBy('creadoEn', 'desc').limit(30).get(),
      liviano ? Promise.resolve(null) : destinatariosVigentes(),
      cupoDeHoy(),
    ])
    const historial = snap.docs.map(d => {
      const x = d.data()
      const total = Number(x.total) || 0, enviados = Number(x.enviados) || 0, fallidos = Number(x.fallidos) || 0, omitidos = Number(x.omitidos) || 0
      return {
        id: d.id, asunto: String(x.asunto ?? ''), estado: String(x.estado ?? ''), creadoEn: iso(x.creadoEn), terminadoEn: iso(x.terminadoEn),
        total, enviados, fallidos, omitidos, pendientes: Math.max(0, total - enviados - fallidos - omitidos),
        ultimoError: typeof x.ultimoError === 'string' ? x.ultimoError : null, por: String(x.creadoPor?.email ?? ''),
      }
    })
    return json({ historial, suscriptos: suscriptos ? suscriptos.length : null, cupo })
  } catch (e) {
    console.error('[admin/novedades] listar', (e as Error).message)
    return json({ error: 'No pudimos cargar las novedades' }, 500)
  }
}

/**
 * Crea el envío: congela la lista de destinatarios (solo recibeNovedades en true y email verificado), guarda el mail ya armado
 * y despierta la función de fondo, que manda por lotes respetando el cupo diario. Un solo envío a la vez.
 */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'novedades-enviar', minRol: 'admin', maxPorMinuto: 6 })
  if ('error' in r) return r.error
  const parsed = NovedadSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá el asunto, el mensaje y la imagen', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  try {
    const activas = await campanas().where('estado', 'in', ACTIVAS).get()
    // Un «preparando» de hace más de 10 minutos quedó trunco (se cortó la preparación): no bloquea.
    const vivas = activas.docs.filter(d => d.get('estado') !== 'preparando' || Date.now() - (d.get('creadoEn') instanceof Timestamp ? d.get('creadoEn').toMillis() : 0) < 10 * 60_000)
    if (vivas.length) return json({ error: 'Ya hay un envío en curso. Esperá a que termine para mandar otro.' }, 409)

    const destinatarios = await destinatariosVigentes()
    if (!destinatarios.length) return json({ error: 'Todavía no hay personas suscriptas con el email verificado.' }, 409)

    const { html, texto } = await renderizar(parsed.data)
    const ref = campanas().doc()
    await ref.set({
      ...parsed.data, html, texto,
      total: destinatarios.length, enviados: 0, fallidos: 0, omitidos: 0,
      estado: 'preparando', creadoPor: { uid: r.staff.uid, email: r.staff.email }, creadoEn: FieldValue.serverTimestamp(),
      bloqueadoHasta: 0, terminadoEn: null, ultimoError: null,
    })
    for (let i = 0; i < destinatarios.length; i += 400) {
      const lote = adminDb().batch()
      for (const d of destinatarios.slice(i, i + 400)) lote.set(ref.collection('destinatarios').doc(d.uid), { email: d.email, estado: 'pendiente', intentos: 0 })
      await lote.commit()
    }
    await ref.update({ estado: 'en_cola' })
    const disparado = await dispararEnvio()
    await auditar(r.staff, 'novedad-enviar', { id: ref.id, asunto: parsed.data.asunto, total: destinatarios.length })
    return json({ id: ref.id, total: destinatarios.length, disparado }, 201)
  } catch (e) {
    console.error('[admin/novedades] crear', (e as Error).message)
    return json({ error: 'No pudimos preparar el envío' }, 500)
  }
}
