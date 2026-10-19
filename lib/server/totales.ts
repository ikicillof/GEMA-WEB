import 'server-only'
import type { ItemPedido, ResumenCheckout } from '@/lib/envio'
import { resolverItems, type CarritoResuelto } from '@/lib/server/carrito'
import { getConfiguracion } from '@/lib/server/catalogo'
import { ErrorEnvio, cotizar, sucursales } from '@/lib/server/micorreo'

export type EnvioPedido = { modalidad: 'domicilio' | 'sucursal'; cp: string; provincia: string; sucursal?: string }

export type Totales = {
  carrito: CarritoResuelto
  envio: ResumenCheckout['envio']
  envioError: boolean // se pidió un envío pero no se pudo cotizar
  simulado: boolean
  descuentoPct: number
  descuento: number // sobre productos, no sobre el envío
}

/**
 * Única fuente de los montos: precios del catálogo, envío cotizado de nuevo con MiCorreo y descuento por transferencia
 * de la configuración. La usan el resumen del checkout y la creación de la venta, para que muestren y cobren lo mismo.
 * Del navegador solo entran producto, color, cantidad y la modalidad de envío elegida.
 */
export async function calcularTotales(items: ItemPedido[], pedido?: EnvioPedido): Promise<Totales | { error: string }> {
  const carrito = await resolverItems(items)

  let descuentoPct = 10
  try { descuentoPct = (await getConfiguracion()).descuentoTransferenciaPct } catch { /* sin configuración: queda el 10 % por defecto */ }

  let envio: ResumenCheckout['envio'] = null
  let envioError = false
  let simulado = false
  if (pedido && carrito.lineas.length) {
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
            const elegida = (await sucursales(pedido.provincia, pedido.cp)).lista.find(s => s.codigo === pedido.sucursal)
            if (!elegida) return { error: 'Esa sucursal no está disponible.' }
            envio.sucursal = elegida
          }
        }
      } catch (e) {
        if (!(e instanceof ErrorEnvio)) throw e
        console.error('[totales]', e.message)
        envioError = true
      }
    }
  }
  return { carrito, envio, envioError, simulado, descuentoPct, descuento: Math.round((carrito.subtotal * descuentoPct) / 100) }
}
