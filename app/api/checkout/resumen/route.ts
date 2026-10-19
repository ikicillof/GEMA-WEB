import type { ResumenCheckout } from '@/lib/envio'
import { json } from '@/lib/server/auth'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { calcularTotales } from '@/lib/server/totales'
import { ResumenSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

/**
 * Resumen del pedido. TODOS los montos se calculan acá (ver calcularTotales): precios del catálogo, envío cotizado
 * de nuevo con MiCorreo y descuento por transferencia de la configuración. Del navegador solo se aceptan producto,
 * color, cantidad y la modalidad de envío elegida.
 */
export async function POST(req: Request) {
  const sesion = await exigirUsuario(req, 'resumen', 40)
  if ('error' in sesion) return sesion.error
  const parsed = ResumenSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)

  const t = await calcularTotales(parsed.data.items, parsed.data.envio)
  if ('error' in t) return json({ error: t.error }, 400)
  if (!t.carrito.lineas.length) return json({ error: 'Tu carrito no tiene productos disponibles.' }, 400)

  const precioEnvio = t.envio?.precio ?? 0
  const resumen: ResumenCheckout = {
    lineas: t.carrito.lineas,
    subtotal: t.carrito.subtotal,
    envio: t.envio,
    envioError: t.envioError,
    transferencia: { descuentoPct: t.descuentoPct, descuento: t.descuento, total: t.carrito.subtotal - t.descuento + precioEnvio },
    mercadoPago: { total: t.carrito.subtotal + precioEnvio },
    simulado: t.simulado,
  }
  return json(resumen)
}
