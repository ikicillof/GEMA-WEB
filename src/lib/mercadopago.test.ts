import { describe, it, expect, beforeAll } from 'vitest'
import {
  buildPreferencePayload,
  mapMercadoPagoStatusToOrderStatus,
  parseWebhookPayload,
} from './mercadopago'
import type { Order } from '@/types/order'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://gemma.example.com'
})

const order: Order = {
  id: 'order-1',
  items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
  shippingZoneId: 'caba',
  paymentMethod: 'mercado_pago',
  customerEmail: 'cliente@example.com',
  address: 'Calle Falsa 123',
  total: 35500,
  paymentStatus: 'pendiente',
  shippingStatus: 'a_confirmar',
  createdAt: new Date().toISOString(),
}

describe('buildPreferencePayload', () => {
  it('includes one item per order item plus the order id as external_reference', () => {
    const payload = buildPreferencePayload(order)
    expect(payload.items).toHaveLength(2)
    expect(payload.items[0]).toMatchObject({ quantity: 1, unit_price: 32000, currency_id: 'ARS' })
    expect(payload.external_reference).toBe('order-1')
  })

  it('includes the shipping cost as an explicit line item', () => {
    const payload = buildPreferencePayload(order)
    expect(payload.items[1]).toMatchObject({
      title: 'Envío',
      quantity: 1,
      unit_price: 3500,
      currency_id: 'ARS',
    })
  })

  it('the sum of all preference line items matches order.total (no shipping is ever silently dropped)', () => {
    const payload = buildPreferencePayload(order)
    const preferenceTotal = payload.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    )
    expect(preferenceTotal).toBe(order.total)
  })

  it('does not add a shipping line item for a free/pickup zone', () => {
    const pickupOrder: Order = {
      ...order,
      shippingZoneId: 'retiro-vicente-lopez',
      total: 32000,
    }
    const payload = buildPreferencePayload(pickupOrder)
    expect(payload.items.map((i) => i.title)).not.toContain('Envío')
  })

  it('throws a clear error when NEXT_PUBLIC_SITE_URL is not set', () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    try {
      expect(() => buildPreferencePayload(order)).toThrow(
        'Falta la variable de entorno NEXT_PUBLIC_SITE_URL'
      )
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = original
    }
  })
})

describe('mapMercadoPagoStatusToOrderStatus', () => {
  it.each([
    ['approved', 'pagado'],
    ['rejected', 'rechazado'],
    ['pending', 'pendiente'],
    ['in_process', 'pendiente'],
  ])('maps MP status %s to order status %s', (mpStatus, expected) => {
    expect(mapMercadoPagoStatusToOrderStatus(mpStatus)).toBe(expected)
  })
})

describe('parseWebhookPayload', () => {
  it('extracts orderId and status from a valid payload', () => {
    const raw = { data: { id: 'mp-payment-1' }, external_reference: 'order-1', status: 'approved' }
    expect(parseWebhookPayload(raw)).toEqual({ orderId: 'order-1', mpStatus: 'approved' })
  })

  it('returns null for a malformed payload', () => {
    expect(parseWebhookPayload({ foo: 'bar' })).toBeNull()
  })
})
