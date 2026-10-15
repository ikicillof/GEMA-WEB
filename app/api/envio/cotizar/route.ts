import { json } from '@/lib/server/auth'
import { resolverItems } from '@/lib/server/carrito'
import { ErrorEnvio, cotizar } from '@/lib/server/micorreo'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { CotizarSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

// Cuando no se puede cotizar, el navegador ofrece coordinar por WhatsApp (whatsapp: true) en vez de bloquear la compra.
const sinCotizar = (error: string, status: number) => json({ error, whatsapp: true }, status)

/** Cotiza el envío con el peso y las medidas del catálogo (no con lo que mande el navegador). */
export async function POST(req: Request) {
  const sesion = await exigirUsuario(req, 'cotizar', 20)
  if ('error' in sesion) return sesion.error
  const parsed = CotizarSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)

  const carrito = await resolverItems(parsed.data.items)
  if (!carrito.lineas.length) return json({ error: 'Tu carrito no tiene productos disponibles.' }, 400)
  if (carrito.faltaLogistica) return sinCotizar('Todavía no tenemos el peso y las medidas de algún producto para cotizar el envío.', 422)
  if (carrito.excede || !carrito.paquete) return sinCotizar('El pedido es muy grande para un solo envío. Coordinemos el envío por WhatsApp.', 422)

  try {
    return json(await cotizar(parsed.data.cp, carrito.paquete))
  } catch (e) {
    if (!(e instanceof ErrorEnvio)) throw e
    console.error('[envio/cotizar]', e.message)
    return sinCotizar('No pudimos cotizar el envío en este momento.', 502)
  }
}
