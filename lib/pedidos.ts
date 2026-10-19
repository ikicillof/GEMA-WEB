// Tipos y reglas de los pedidos (colección `orders`). Sin secretos ni acceso a datos: lo usan el servidor y el navegador.
import type { DatosEnvio, LineaResumen, Modalidad, Sucursal } from '@/lib/envio'

export const ESTADOS = ['pendiente_pago', 'pagado', 'transferencia_en_proceso', 'completado', 'cancelado'] as const
export type EstadoPedido = (typeof ESTADOS)[number]
export type MetodoPago = 'mercadopago' | 'transferencia'

export const ESTADO_TEXTO: Record<EstadoPedido, string> = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  transferencia_en_proceso: 'Esperando tu transferencia',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

/** Lo que se le muestra a la persona dueña del pedido (nunca el documento crudo de Firestore). */
export type PedidoPublico = {
  id: string
  estado: EstadoPedido
  metodoPago: MetodoPago
  creadoEn: string // ISO
  lineas: LineaResumen[]
  subtotal: number
  descuento: number
  envio: { modalidad: Modalidad; servicio: string; precio: number; sucursal?: Sucursal } | null
  total: number
  entrega: Pick<DatosEnvio, 'nombre' | 'calle' | 'numero' | 'piso' | 'localidad' | 'provincia' | 'cp'>
  modoPrueba: boolean
  instruccionesTransferencia?: string // solo mientras se espera la transferencia
}

/**
 * Estado de la venta según el estado del pago en Mercado Pago. Regla de oro: una venta pagada NUNCA retrocede.
 *  - approved con el monto correcto -> pagado (también desde cancelado: la plata ya entró, se marca para revisar).
 *  - approved con otro monto, o devoluciones/contracargos sobre una venta pagada -> no cambia y pide revisión.
 *  - rechazado, pendiente, en proceso, etc. -> no cambia (la persona puede reintentar con la misma preferencia).
 */
export function siguienteEstado(actual: EstadoPedido, estadoPago: string, montoCorrecto: boolean): { estado: EstadoPedido; revision: boolean } {
  const pagada = actual === 'pagado' || actual === 'completado'
  if (estadoPago === 'approved') {
    if (!montoCorrecto) return { estado: actual, revision: true }
    if (pagada) return { estado: actual, revision: false }
    return { estado: 'pagado', revision: actual === 'cancelado' }
  }
  if (pagada && (estadoPago === 'refunded' || estadoPago === 'charged_back' || estadoPago === 'cancelled')) return { estado: actual, revision: true }
  return { estado: actual, revision: false }
}
