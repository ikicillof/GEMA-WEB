'use server'

import { createOrderFromCart, createInMemoryOrdersRepository } from '@/lib/orders'
import { buildPreferencePayload, createPreference } from '@/lib/mercadopago'
import { getAllProducts } from '@/lib/catalog'
import { computeTransferPrice } from '@/lib/pricing'
import type { OrderInput, OrderItem, PaymentMethod } from '@/types/order'

function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    throw new Error('Falta la variable de entorno MERCADOPAGO_ACCESS_TOKEN')
  }
  return token
}

// El cliente envía unitPrice, pero nunca confiamos en ese valor: siempre
// recalculamos el precio real desde el catálogo (y el descuento por
// transferencia/efectivo si corresponde) antes de crear cualquier pedido.
// Esto evita que alguien edite el carrito en localStorage (o llame a este
// Server Action directamente) para pagar un precio arbitrario.
function repriceItems(items: OrderItem[], paymentMethod: PaymentMethod): OrderItem[] {
  const products = getAllProducts()
  const hasTransferDiscount = paymentMethod === 'transferencia' || paymentMethod === 'efectivo'
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) {
      throw new Error(`Producto desconocido: ${item.productId}`)
    }
    return {
      ...item,
      unitPrice: hasTransferDiscount ? computeTransferPrice(product.price) : product.price,
    }
  })
}

export async function confirmMercadoPagoOrder(
  input: OrderInput
): Promise<{ initPoint: string }> {
  // createInMemoryOrdersRepository se reemplaza por createSupabaseOrdersRepository
  // (Tarea 16) una vez que el proyecto Supabase real esté configurado.
  const repo = createInMemoryOrdersRepository()
  const safeInput: OrderInput = { ...input, items: repriceItems(input.items, input.paymentMethod) }
  const order = await createOrderFromCart(repo, safeInput)
  const payload = buildPreferencePayload(order)
  const { init_point } = await createPreference(payload, getMercadoPagoAccessToken())
  return { initPoint: init_point }
}

export async function confirmCashOrTransferOrder(
  input: OrderInput
): Promise<{ id: string; total: number }> {
  const repo = createInMemoryOrdersRepository()
  const safeInput: OrderInput = { ...input, items: repriceItems(input.items, input.paymentMethod) }
  const order = await createOrderFromCart(repo, safeInput)
  return { id: order.id, total: order.total }
}
