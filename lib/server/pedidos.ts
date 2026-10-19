import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { ESTADOS, siguienteEstado, type EstadoPedido, type PedidoPublico } from '@/lib/pedidos'
import { avisarTransferenciaCompletada, avisarVentaNueva } from '@/lib/server/emails'
import { ErrorMercadoPago, pagosDeLaVenta, type PagoMP } from '@/lib/server/mercadopago'

export const pedidos = () => adminDb().collection('orders')

const esEstado = (v: unknown): v is EstadoPedido => (ESTADOS as readonly unknown[]).includes(v)

export type ResultadoPago = 'actualizado' | 'sin_cambios' | 'no_existe' | 'ajeno'

/**
 * Aplica un pago ya consultado a Mercado Pago sobre su venta, dentro de una transacción.
 * Idempotente: repetir la misma notificación no cambia nada ni duplica el historial. Nunca retrocede una venta pagada.
 */
export async function aplicarPago(pedidoId: string, pago: PagoMP): Promise<ResultadoPago> {
  if (pago.external_reference !== pedidoId) return 'ajeno'
  const ref = pedidos().doc(pedidoId)
  let pasoAPagado = false
  const resultado = await adminDb().runTransaction(async tx => {
    pasoAPagado = false
    const snap = await tx.get(ref)
    if (!snap.exists) return 'no_existe' as const
    const d = snap.data()!
    const actual: EstadoPedido = esEstado(d.estado) ? d.estado : 'pendiente_pago'
    const montoCorrecto = pago.currency_id === 'ARS' && typeof d.total === 'number' && Math.abs(pago.transaction_amount - d.total) < 0.01
    const { estado, revision } = siguienteEstado(actual, pago.status, montoCorrecto)

    // El estado de pago que queda guardado es el "más importante": uno aprobado no se pisa con un rechazo de otro intento.
    const yaAprobado = d.mpStatus === 'approved' && d.pagoId !== String(pago.id)
    const cambios: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {}
    if (!yaAprobado) {
      if (d.pagoId !== String(pago.id)) cambios.pagoId = String(pago.id)
      if (d.mpStatus !== pago.status) cambios.mpStatus = pago.status
    }
    if (estado !== actual) {
      cambios.estado = estado
      pasoAPagado = estado === 'pagado'
      cambios.historial = FieldValue.arrayUnion({ estado, en: new Date().toISOString(), motivo: `Pago ${pago.id}: ${pago.status}` })
    }
    if (revision && d.requiereRevision !== true) cambios.requiereRevision = true
    if (!Object.keys(cambios).length) return 'sin_cambios' as const
    cambios.actualizadoEn = FieldValue.serverTimestamp()
    tx.update(ref, cambios)
    return 'actualizado' as const
  })
  // Venta nueva cobrada: se avisa a la dueña y al cliente (una sola vez por venta; si Resend falla, queda anotado para reintentar).
  if (resultado === 'actualizado' && pasoAPagado) await avisarVentaNueva(pedidoId)
  return resultado
}

export type ResultadoCompletar = 'completada' | 'no_existe' | 'estado_invalido'

/** La dueña confirma que llegó la transferencia: transferencia_en_proceso -> completado, y se le avisa al cliente. */
export async function completarTransferencia(pedidoId: string, quien: string): Promise<ResultadoCompletar> {
  const ref = pedidos().doc(pedidoId)
  const resultado = await adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return 'no_existe' as const
    if (snap.data()?.estado !== 'transferencia_en_proceso') return 'estado_invalido' as const
    const estado: EstadoPedido = 'completado'
    tx.update(ref, { estado, historial: FieldValue.arrayUnion({ estado, en: new Date().toISOString(), motivo: `Transferencia confirmada por ${quien}` }), actualizadoEn: FieldValue.serverTimestamp() })
    return 'completada' as const
  })
  if (resultado === 'completada') await avisarTransferenciaCompletada(pedidoId)
  return resultado
}

/**
 * Red de seguridad por si el webhook se demora: consulta a Mercado Pago los pagos de la venta y los aplica.
 * Pensada para el pedido pendiente que la persona está mirando; si Mercado Pago no responde, sigue sin romper nada.
 */
export async function sincronizarPedido(pedidoId: string): Promise<void> {
  try {
    const pagos = await pagosDeLaVenta(pedidoId)
    // Primero los aprobados, así un rechazo viejo no tapa la aprobación.
    pagos.sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved'))
    for (const p of pagos) await aplicarPago(pedidoId, p)
  } catch (e) {
    if (!(e instanceof ErrorMercadoPago)) throw e
    console.error('[pedidos] sincronizar:', e.message)
  }
}

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : new Date(0).toISOString())

/** Documento de Firestore -> lo que ve la persona dueña (sin DNI, teléfono, ids de pago ni marcas internas). */
export function aPublico(id: string, d: FirebaseFirestore.DocumentData): PedidoPublico {
  const e = d.datosEnvio ?? {}
  return {
    id,
    estado: esEstado(d.estado) ? d.estado : 'pendiente_pago',
    metodoPago: d.metodoPago === 'transferencia' ? 'transferencia' : 'mercadopago',
    creadoEn: iso(d.creadoEn),
    lineas: Array.isArray(d.lineas) ? d.lineas : [],
    subtotal: Number(d.subtotal) || 0,
    descuento: Number(d.descuento) || 0,
    envio: d.envio ?? null,
    total: Number(d.total) || 0,
    entrega: { nombre: e.nombre ?? '', calle: e.calle ?? '', numero: e.numero ?? '', piso: e.piso ?? '', localidad: e.localidad ?? '', provincia: e.provincia ?? '', cp: e.cp ?? '' },
    modoPrueba: d.modoPrueba === true,
  }
}
