import { randomUUID } from 'node:crypto'
import { calculateShippingTotal } from './shipping'
import type { Order, OrderInput, OrderItem, PaymentStatus } from '@/types/order'

export function computeOrderTotal(items: OrderItem[], shippingTotal: number): number {
  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  return itemsTotal + shippingTotal
}

export interface OrdersRepository {
  createOrder(input: OrderInput, total: number): Promise<Order>
  updateOrderPaymentStatus(orderId: string, status: PaymentStatus): Promise<Order>
}

export async function createOrderFromCart(
  repo: OrdersRepository,
  input: OrderInput
): Promise<Order> {
  const shippingTotal = calculateShippingTotal(input.shippingZoneId)
  const total = computeOrderTotal(input.items, shippingTotal)
  return repo.createOrder(input, total)
}

export function createInMemoryOrdersRepository(): OrdersRepository {
  const orders = new Map<string, Order>()

  return {
    async createOrder(input, total) {
      const order: Order = {
        ...input,
        id: randomUUID(),
        total,
        paymentStatus: 'pendiente',
        shippingStatus: 'a_confirmar',
        createdAt: new Date().toISOString(),
      }
      orders.set(order.id, order)
      return order
    },
    async updateOrderPaymentStatus(orderId, status) {
      const order = orders.get(orderId)
      if (!order) {
        throw new Error(`updateOrderPaymentStatus: unknown order ${orderId}`)
      }
      const updated: Order = { ...order, paymentStatus: status }
      orders.set(orderId, updated)
      return updated
    },
  }
}
