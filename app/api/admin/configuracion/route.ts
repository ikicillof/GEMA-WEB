import { revalidateTag } from 'next/cache'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { ConfiguracionSchema } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

// Alias de los datos de EJEMPLO que se cargaron al principio: mientras siga este, el aviso de provisorio queda prendido.
const ALIAS_DE_EJEMPLO = 'gemma.tienda.ejemplo'
const doc = () => adminDb().doc('configuracion/general')

export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'config', minRol: 'admin' })
  if ('error' in r) return r.error
  try {
    const d = (await doc().get()).data() ?? {}
    const t = d.datosTransferencia && typeof d.datosTransferencia === 'object' ? d.datosTransferencia : {}
    return json({
      configuracion: {
        descuentoTransferenciaPct: typeof d.descuentoTransferenciaPct === 'number' ? d.descuentoTransferenciaPct : 10,
        datosTransferencia: { alias: String(t.alias ?? ''), titular: String(t.titular ?? ''), banco: String(t.banco ?? '') },
        whatsapp: String(d.whatsapp ?? ''),
        emailAvisos: String(d.emailAvisos ?? ''),
        provisorio: d.datosProvisorios === true || t.provisorio === true,
      },
    })
  } catch (e) {
    console.error('[admin/config] leer', (e as Error).message)
    return json({ error: 'No pudimos cargar la configuración' }, 500)
  }
}

/** Guarda los ajustes de la tienda. Al guardar datos reales (alias distinto del de ejemplo) se apaga el aviso de provisorio. */
export async function PUT(req: Request) {
  const r = await exigirStaff(req, { ruta: 'config-guardar', minRol: 'admin', maxPorMinuto: 20 })
  if ('error' in r) return r.error
  const parsed = ConfiguracionSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá los datos', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  const c = parsed.data
  const provisorio = c.datosTransferencia.alias === ALIAS_DE_EJEMPLO
  try {
    await doc().set({
      descuentoTransferenciaPct: c.descuentoTransferenciaPct,
      datosTransferencia: { ...c.datosTransferencia, provisorio },
      whatsapp: c.whatsapp,
      emailAvisos: c.emailAvisos,
      datosProvisorios: provisorio,
      actualizadoEn: FieldValue.serverTimestamp(),
    }, { merge: true })
    revalidateTag('configuracion') // la web y los mails leen la configuración con caché de 1 minuto
    await auditar(r.staff, 'configuracion-editar', { provisorio })
    return json({ ok: true, provisorio })
  } catch (e) {
    console.error('[admin/config] guardar', (e as Error).message)
    return json({ error: 'No pudimos guardar la configuración' }, 500)
  }
}
