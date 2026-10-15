import { adminDb } from '@/lib/firebase/admin'
import { json } from '@/lib/server/auth'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { DatosEnvioSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

/** Datos de envío guardados en la cuenta (null si todavía no cargó ninguno). */
export async function GET(req: Request) {
  const sesion = await exigirUsuario(req, 'envio-get')
  if ('error' in sesion) return sesion.error
  try {
    const datos = (await adminDb().collection('users').doc(sesion.uid).get()).data()?.datosEnvio
    return json({ datos: datos ?? null, emailCuenta: sesion.email })
  } catch (e) {
    console.error('[cuenta/envio] GET', (e as Error).message)
    return json({ error: 'No pudimos cargar tus datos' }, 500)
  }
}

/** Guarda los datos de envío para la próxima compra. Se validan todos los campos en el servidor. */
export async function PUT(req: Request) {
  const sesion = await exigirUsuario(req, 'envio-put', 20)
  if ('error' in sesion) return sesion.error
  const parsed = DatosEnvioSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Revisá los datos: hay campos incompletos o con formato inválido.' }, 400)
  try {
    await adminDb().collection('users').doc(sesion.uid).set({ datosEnvio: parsed.data }, { merge: true })
    return json({ ok: true })
  } catch (e) {
    console.error('[cuenta/envio] PUT', (e as Error).message)
    return json({ error: 'No pudimos guardar tus datos' }, 500)
  }
}
