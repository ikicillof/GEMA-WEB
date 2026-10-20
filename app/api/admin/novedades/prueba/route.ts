import { Resend } from 'resend'
import { cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { conBaja, contarEnvios, renderizar, sitio } from '@/lib/server/novedades-admin'
import { NovedadSchema } from '@/lib/server/novedades-schemas'
import { firmarBaja } from '@/lib/server/novedades-token'

export const dynamic = 'force-dynamic'

/** Manda el mail SOLO a quien lo pide (con [PRUEBA] en el asunto), para verlo en su casilla antes del envío real. Solo admin o creador. */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'novedades-prueba', minRol: 'admin', maxPorMinuto: 6 })
  if ('error' in r) return r.error
  const parsed = NovedadSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá el asunto, el mensaje y la imagen', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  if (!r.staff.email) return json({ error: 'Tu cuenta no tiene email' }, 400)
  const clave = process.env.RESEND_API_KEY?.trim()
  const desde = process.env.RESEND_FROM_EMAIL?.trim()
  if (!clave || !desde) {
    console.error('[admin/novedades] prueba: faltan RESEND_API_KEY o RESEND_FROM_EMAIL')
    return json({ error: 'El envío de mails no está configurado todavía.' }, 503)
  }
  try {
    const { html, texto } = await renderizar(parsed.data)
    const urlBaja = `${sitio()}/baja?t=${firmarBaja(r.staff.uid)}`
    const respuestas = process.env.RESEND_REPLY_TO?.trim()
    const { error } = await new Resend(clave).emails.send({
      from: desde, to: r.staff.email, subject: `[PRUEBA] ${parsed.data.asunto}`,
      html: conBaja(html, urlBaja), text: conBaja(texto, urlBaja), ...(respuestas ? { replyTo: respuestas } : {}),
    })
    if (error) {
      console.error('[admin/novedades] prueba:', `${error.name}: ${error.message}`)
      return json({ error: 'Resend no pudo mandar la prueba. Revisá la configuración del dominio.' }, 502)
    }
    await contarEnvios(1)
    return json({ ok: true, para: r.staff.email })
  } catch (e) {
    console.error('[admin/novedades] prueba', (e as Error).message)
    return json({ error: 'No pudimos mandar la prueba' }, 500)
  }
}
