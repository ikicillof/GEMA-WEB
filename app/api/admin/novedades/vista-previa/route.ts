import { cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'
import { conBaja, renderizar } from '@/lib/server/novedades-admin'
import { NovedadSchema } from '@/lib/server/novedades-schemas'

export const dynamic = 'force-dynamic'

/** El mail tal cual se va a mandar (misma plantilla), para mostrarlo en el panel. El link de baja queda inerte. Solo admin o creador. */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'novedades-vista', minRol: 'admin', maxPorMinuto: 30 })
  if ('error' in r) return r.error
  const parsed = NovedadSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá el asunto, el mensaje y la imagen', campos: parsed.error.issues.map(i => i.path.join('.')) }, 400)
  try {
    const { html } = await renderizar(parsed.data)
    return json({ html: conBaja(html, '#') })
  } catch (e) {
    console.error('[admin/novedades] vista previa', (e as Error).message)
    return json({ error: 'No pudimos armar la vista previa' }, 500)
  }
}
