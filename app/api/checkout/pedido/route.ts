import { FieldValue } from 'firebase-admin/firestore'
import type { EstadoPedido, MetodoPago } from '@/lib/pedidos'
import { json } from '@/lib/server/auth'
import { avisarVentaNueva } from '@/lib/server/emails'
import { crearPreferencia, esModoPrueba, mercadoPagoConfigurado, urlDelSitio } from '@/lib/server/mercadopago'
import { pedidos } from '@/lib/server/pedidos'
import { exigirUsuario, leerCuerpo } from '@/lib/server/sesion'
import { calcularTotales } from '@/lib/server/totales'
import { PedidoSchema } from '@/lib/server/validacion'

export const dynamic = 'force-dynamic'

/**
 * Crea la venta (colección `orders`) y, si paga con Mercado Pago, la preferencia de Checkout Pro.
 * Los montos se recalculan acá desde cero (catálogo + cotización de MiCorreo + descuento de la configuración):
 * del navegador solo entran producto, color, cantidad, modalidad de envío, datos de entrega y forma de pago.
 */
export async function POST(req: Request) {
  const sesion = await exigirUsuario(req, 'pedido', 10)
  if ('error' in sesion) return sesion.error
  const parsed = PedidoSchema.safeParse(await leerCuerpo(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  const { items, envio: envioPedido, datosEnvio, metodoPago } = parsed.data

  // El envío tiene que corresponder a la dirección de entrega, y a sucursal necesita una sucursal elegida.
  if (envioPedido.cp !== datosEnvio.cp || envioPedido.provincia !== datosEnvio.provincia) return json({ error: 'El envío no coincide con la dirección de entrega.' }, 400)
  if (envioPedido.modalidad === 'sucursal' && !envioPedido.sucursal) return json({ error: 'Elegí la sucursal de retiro.' }, 400)

  const urlSitio = urlDelSitio()
  if (metodoPago === 'mercadopago' && (!mercadoPagoConfigurado() || !urlSitio)) {
    console.error('[pedido] Mercado Pago o SITE_URL sin configurar')
    return json({ error: 'El pago con Mercado Pago no está disponible por ahora. Probá con transferencia o escribinos por WhatsApp.', whatsapp: true }, 503)
  }

  try {
    const t = await calcularTotales(items, envioPedido)
    if ('error' in t) return json({ error: t.error }, 400)
    const { carrito, envio } = t
    if (!carrito.lineas.length) return json({ error: 'Tu carrito no tiene productos disponibles.' }, 400)
    if (carrito.descartados > 0) return json({ error: 'Algunos productos ya no están disponibles. Revisá tu carrito.' }, 409)
    if (!envio || t.envioError) return json({ error: 'No pudimos cotizar el envío. Podés coordinarlo por WhatsApp.', whatsapp: true }, 422)

    const descuento = metodoPago === 'transferencia' ? t.descuento : 0
    const total = carrito.subtotal - descuento + envio.precio
    const estado: EstadoPedido = metodoPago === 'transferencia' ? 'transferencia_en_proceso' : 'pendiente_pago'

    const ref = pedidos().doc()
    await ref.set({
      uid: sesion.uid,
      email: sesion.email,
      estado,
      metodoPago: metodoPago as MetodoPago,
      lineas: carrito.lineas,
      subtotal: carrito.subtotal,
      descuento,
      envio: { modalidad: envio.modalidad, servicio: envio.servicio, precio: envio.precio, ...(envio.sucursal ? { sucursal: envio.sucursal } : {}) },
      total,
      moneda: 'ARS',
      datosEnvio,
      cotizacionSimulada: t.simulado,
      modoPrueba: esModoPrueba(),
      historial: [{ estado, en: new Date().toISOString(), motivo: 'Venta creada' }],
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    })

    if (metodoPago === 'transferencia') {
      await avisarVentaNueva(ref.id) // nunca lanza: si Resend falla, la venta queda guardada y el error anotado
      return json({ pedidoId: ref.id, metodoPago, total }, 201)
    }

    try {
      const pref = await crearPreferencia({
        pedidoId: ref.id,
        email: datosEnvio.email,
        nombre: datosEnvio.nombre,
        urlSitio: urlSitio!,
        items: [
          ...carrito.lineas.map(l => ({ title: `${l.name} (${l.color})`, quantity: l.quantity, unit_price: l.price })),
          { title: `Envío Correo Argentino (${envio.modalidad === 'domicilio' ? 'a domicilio' : 'a sucursal'})`, quantity: 1, unit_price: envio.precio },
        ],
      })
      await ref.update({ preferenciaId: pref.id, actualizadoEn: FieldValue.serverTimestamp() })
      return json({ pedidoId: ref.id, metodoPago, total, url: pref.init_point }, 201)
    } catch (e) {
      // Sin preferencia no hay nada que cobrar: se cancela la venta para que no quede colgada.
      const cancelado: EstadoPedido = 'cancelado'
      await ref.update({ estado: cancelado, historial: FieldValue.arrayUnion({ estado: cancelado, en: new Date().toISOString(), motivo: 'No se pudo crear el pago' }), actualizadoEn: FieldValue.serverTimestamp() })
      console.error('[pedido] preferencia:', (e as Error).message)
      return json({ error: 'No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos.', whatsapp: true }, 502)
    }
  } catch (e) {
    console.error('[pedido]', (e as Error).message)
    return json({ error: 'No pudimos crear tu pedido. Probá de nuevo.' }, 500)
  }
}
