import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, OrderInput, PaymentStatus } from '@/types/order'
import type { OrdersRepository } from '@/lib/orders'

export function createSupabaseOrdersRepository(client: SupabaseClient): OrdersRepository {
  return {
    async createOrder(input: OrderInput, total: number): Promise<Order> {
      const { data, error } = await client
        .from('orders')
        .insert({
          items: input.items,
          shipping_zone_id: input.shippingZoneId,
          payment_method: input.paymentMethod,
          customer_email: input.customerEmail,
          address: input.address,
          total,
          payment_status: 'pendiente',
          shipping_status: 'a_confirmar',
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(`createOrder failed: ${error?.message ?? 'sin datos'}`)
      }

      return {
        id: data.id,
        items: input.items,
        shippingZoneId: input.shippingZoneId,
        paymentMethod: input.paymentMethod,
        customerEmail: input.customerEmail,
        address: input.address,
        total: data.total,
        paymentStatus: 'pendiente',
        shippingStatus: 'a_confirmar',
        createdAt: data.created_at,
      }
    },

    async updateOrderPaymentStatus(orderId: string, status: PaymentStatus): Promise<Order> {
      const { data, error } = await client
        .from('orders')
        .update({ payment_status: status })
        .eq('id', orderId)
        .select()
        .single()

      if (error || !data) {
        throw new Error(`updateOrderPaymentStatus failed: ${error?.message ?? 'sin datos'}`)
      }

      return {
        id: data.id,
        items: data.items,
        shippingZoneId: data.shipping_zone_id,
        paymentMethod: data.payment_method,
        customerEmail: data.customer_email,
        address: data.address,
        total: data.total,
        paymentStatus: status,
        shippingStatus: data.shipping_status,
        createdAt: data.created_at,
      }
    },
  }
}
