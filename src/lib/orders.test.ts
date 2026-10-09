import { describe, it, expect } from 'vitest'
import {
  computeOrderTotal,
  createOrderFromCart,
  createInMemoryOrdersRepository,
} from './orders'
import type { OrderInput } from '@/types/order'

describe('computeOrderTotal', () => {
  it('sums item totals plus shipping', () => {
    const total = computeOrderTotal(
      [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 2, unitPrice: 32000 }],
      3500
    )
    expect(total).toBe(2 * 32000 + 3500)
  })
})

describe('createOrderFromCart', () => {
  const input: OrderInput = {
    items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
    shippingZoneId: 'caba',
    paymentMethod: 'transferencia',
    customerEmail: 'cliente@example.com',
    address: 'Calle Falsa 123',
  }

  it('creates an order with the correct total and initial statuses', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await createOrderFromCart(repo, input)
    expect(order.total).toBe(32000 + 3500)
    expect(order.paymentStatus).toBe('pendiente')
    expect(order.shippingStatus).toBe('a_confirmar')
    expect(order.id).toBeTruthy()
  })

  it('persists the order in the repository', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await createOrderFromCart(repo, input)
    const updated = await repo.updateOrderPaymentStatus(order.id, 'pagado')
    expect(updated.paymentStatus).toBe('pagado')
  })

  it('throws when updating a non-existent order', async () => {
    const repo = createInMemoryOrdersRepository()
    await expect(repo.updateOrderPaymentStatus('no-existe', 'pagado')).rejects.toThrow()
  })

  it('returns the created order by id via getOrder', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await createOrderFromCart(repo, input)
    const fetched = await repo.getOrder(order.id)
    expect(fetched?.id).toBe(order.id)
  })

  it('returns null from getOrder for an unknown id', async () => {
    const repo = createInMemoryOrdersRepository()
    const fetched = await repo.getOrder('no-existe')
    expect(fetched).toBeNull()
  })

  it('rejects when the shipping zone is unknown', async () => {
    const repo = createInMemoryOrdersRepository()
    await expect(
      createOrderFromCart(repo, { ...input, shippingZoneId: 'no-existe' })
    ).rejects.toThrow()
  })
})
