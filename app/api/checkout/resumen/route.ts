import type { ResumenCheckout } from '@/lib/envio'
import { json } from '@/lib/server/auth'
import { getConfiguracion } from '@/lib/server/catalogo'
import { resolverItems } from '@/lib/server/carrito'
import { ErrorEnvio, cotizar, sucursales } from '@/lib/server/micorreo'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { ResumenSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

/**
 * Resumen del pedido. TODOS los montos se calculan acá: precios del catálogo, envío cotizado de nuevo con
 * MiCorreo y descuento por transferencia de la configuración. Del navegador solo se aceptan producto, color,
 * cantidad y la modalidad de envío elegida.
 */
export async function POST(req: Request) {
  const sesion = await exigirUsuario(req, 'resumen', 40)
  if ('error' in sesion) return sesion.error
  const parsed = ResumenSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)

  const carrito = await resolverItems(parsed.data.items)
  if (!carrito.lineas.length) return json({ error: 'Tu carrito no tiene productos disponibles.' }, 400)

  let descuentoPct = 10
  try { descuentoPct = (await getConfiguracion()).descuentoTransferenciaPct } catch { /* sin configuración: queda el 10 % por defecto */ }

  let envio: ResumenCheckout['envio'] = null
  let envioError = false
  let simulado = false
  const pedido = parsed.data.envio
  if (pedido) {
    if (!carrito.paquete || carrito.excede) envioError = true
    else {
      try {
        const cot = await cotizar(pedido.cp, carrito.paquete)
        simulado = cot.simulado
        const opcion = cot.opciones.find(o => o.modalidad === pedido.modalidad)
        if (!opcion) envioError = true
        else {
          envio = { ...opcion }
          if (pedido.modalidad === 'sucursal' && pedido.sucursal) {
            // La sucursal tiene que ser una de las que ofrecemos para ese código postal.
            const lista = (await sucursales(pedido.provincia, pedido.cp)).lista
            const elegida = lista.find(s => s.codigo === pedido.sucursal)
            if (!elegida) return json({ error: 'Esa sucursal no está disponible.' }, 400)
            envio.sucursal = elegida
          }
        }
      } catch (e) {
        if (!(e instanceof ErrorEnvio)) throw e
        console.error('[checkout/resumen]', e.message)
        envioError = true
      }
    }
  }

  const precioEnvio = envio?.precio ?? 0
  const descuento = Math.round((carrito.subtotal * descuentoPct) / 100)
  const resumen: ResumenCheckout = {
    lineas: carrito.lineas,
    subtotal: carrito.subtotal,
    envio,
    envioError,
    transferencia: { descuentoPct, descuento, total: carrito.subtotal - descuento + precioEnvio },
    mercadoPago: { total: carrito.subtotal + precioEnvio },
    simulado,
  }
  return json(resumen)
}
