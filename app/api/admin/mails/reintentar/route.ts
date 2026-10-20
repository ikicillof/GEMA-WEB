import { auditar, cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { ReintentoSchema } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'
import { reintentarMailsFallidos } from '@/lib/server/emails'

export const dynamic = 'force-dynamic'

/** Reintenta los mails de venta que fallaron (ventas con mailsPendientes). Con `id`, solo los de esa venta. Solo admin o creador. */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'mails-reintentar', minRol: 'admin', maxPorMinuto: 6 })
  if ('error' in r) return r.error
  const cuerpo = await cuerpoJson(req)
  const parsed = ReintentoSchema.safeParse(cuerpo === undefined ? {} : cuerpo)
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  try {
    const resultado = await reintentarMailsFallidos(parsed.data.id)
    await auditar(r.staff, 'mails-reintentar', { pedidoId: parsed.data.id ?? null, ...resultado })
    return json(resultado)
  } catch (e) {
    console.error('[mails] reintentar', (e as Error).message)
    return json({ error: 'No pudimos reintentar los mails' }, 500)
  }
}
