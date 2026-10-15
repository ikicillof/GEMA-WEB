import { z } from 'zod'
import { CODIGOS_PROVINCIA } from '@/lib/envio'
import { json } from '@/lib/server/auth'
import { ErrorEnvio, sucursales } from '@/lib/server/micorreo'
import { exigirUsuario } from '@/lib/server/sesion'

export const dynamic = 'force-dynamic'

const Consulta = z.object({
  provincia: z.string().refine(c => (CODIGOS_PROVINCIA as readonly string[]).includes(c)),
  cp: z.string().regex(/^\d{4}$/),
})

/** Sucursales de Correo Argentino cercanas al código postal. */
export async function GET(req: Request) {
  const sesion = await exigirUsuario(req, 'sucursales', 30)
  if ('error' in sesion) return sesion.error
  const url = new URL(req.url)
  const parsed = Consulta.safeParse({ provincia: url.searchParams.get('provincia'), cp: url.searchParams.get('cp') })
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  try {
    return json(await sucursales(parsed.data.provincia, parsed.data.cp))
  } catch (e) {
    if (!(e instanceof ErrorEnvio)) throw e
    console.error('[envio/sucursales]', e.message)
    return json({ error: 'No pudimos traer las sucursales en este momento.', whatsapp: true }, 502)
  }
}
