'use server'

import { createOrderFromCart, computeOrderTotal } from '@/lib/orders'
import { getOrdersRepository } from '@/lib/orders/get-orders-repository'
import { buildPreferencePayload, createPreference } from '@/lib/mercadopago'
import { getAllProducts } from '@/lib/catalog'
import { computeTransferPrice } from '@/lib/pricing'
import { calculateShippingTotal } from '@/lib/shipping'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OrderInput, OrderItem, PaymentMethod } from '@/types/order'

function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    throw new Error('Falta la variable de entorno MERCADOPAGO_ACCESS_TOKEN')
  }
  return token
}

// Nunca confiamos en el customerEmail que manda el cliente — lo
// reemplazamos siempre por el de la sesión verificada del lado del
// servidor. Esto cierra el gate de "hay que iniciar sesión para pagar":
// antes era puramente del lado del cliente (shouldRequireAuth en
// checkout/page.tsx) y por lo tanto evitable llamando a este Server
// Action directamente.
async function requireAuthenticatedEmail(): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email
    if (!email) {
      throw new Error('No hay una sesión de usuario autenticada')
    }
    return email
  } catch (error) {
    console.error('requireAuthenticatedEmail failed:', error)
    throw new Error('Necesitás iniciar sesión para confirmar el pedido')
  }
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
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Cantidad inválida para ${item.productId}: ${item.quantity}`)
    }
    const product = products.find((p) => p.id === item.productId)
    if (!product) {
      throw new Error(`Producto desconocido: ${item.productId}`)
    }
    if (!product.available) {
      throw new Error(`Producto desconocido o no disponible: ${item.productId}`)
    }
    const color = product.colors.find((c) => c.name === item.color)
    if (!color || !color.available) {
      throw new Error(`Color no disponible: ${item.productId} (${item.color})`)
    }
    return {
      ...item,
      unitPrice: hasTransferDiscount ? computeTransferPrice(product.price) : product.price,
    }
  })
}

export type CheckoutSummary = {
  items: OrderItem[]
  shippingTotal: number
  total: number
}

// Preview de precio para mostrar en /checkout antes de confirmar: repricea
// igual que las Server Actions que crean el pedido, pero no crea nada ni
// requiere sesión — es puramente informativa.
export async function getCheckoutSummary(input: {
  items: OrderItem[]
  shippingZoneId: string
  paymentMethod: PaymentMethod
}): Promise<CheckoutSummary> {
  const items = repriceItems(input.items, input.paymentMethod)
  const shippingTotal = calculateShippingTotal(input.shippingZoneId)
  const total = computeOrderTotal(items, shippingTotal)
  return { items, shippingTotal, total }
}

export async function confirmMercadoPagoOrder(
  input: OrderInput
): Promise<{ initPoint: string }> {
  const customerEmail = await requireAuthenticatedEmail()
  const repo = await getOrdersRepository()
  const safeInput: OrderInput = {
    ...input,
    customerEmail,
    items: repriceItems(input.items, input.paymentMethod),
  }
  const order = await createOrderFromCart(repo, safeInput)
  const payload = buildPreferencePayload(order)
  const { init_point } = await createPreference(payload, getMercadoPagoAccessToken())
  return { initPoint: init_point }
}

export async function confirmCashOrTransferOrder(
  input: OrderInput
): Promise<{ id: string; total: number }> {
  const customerEmail = await requireAuthenticatedEmail()
  const repo = await getOrdersRepository()
  const safeInput: OrderInput = {
    ...input,
    customerEmail,
    items: repriceItems(input.items, input.paymentMethod),
  }
  const order = await createOrderFromCart(repo, safeInput)
  return { id: order.id, total: order.total }
}
