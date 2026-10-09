import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { handleWebhookPayload, POST } from './route'
import { createInMemoryOrdersRepository } from '@/lib/orders'

describe('handleWebhookPayload', () => {
  it('updates the order payment status on a valid payload', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await repo.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )

    const result = await handleWebhookPayload(repo, {
      external_reference: order.id,
      status: 'approved',
    })

    expect(result.ok).toBe(true)
    const updated = await repo.getOrder(order.id)
    expect(updated?.paymentStatus).toBe('pagado')
  })

  it('ignores a downgrade attempt once the order is already paid', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await repo.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )
    await handleWebhookPayload(repo, { external_reference: order.id, status: 'approved' })

    const result = await handleWebhookPayload(repo, { external_reference: order.id, status: 'pending' })

    expect(result.ok).toBe(true)
    const stillPaid = await repo.getOrder(order.id)
    expect(stillPaid?.paymentStatus).toBe('pagado')
  })

  it('is idempotent: processing the same approved payload twice does not error', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await repo.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )

    const payload = { external_reference: order.id, status: 'approved' }
    const first = await handleWebhookPayload(repo, payload)
    const second = await handleWebhookPayload(repo, payload)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
  })

  it('returns ok:false for a malformed payload instead of throwing', async () => {
    const repo = createInMemoryOrdersRepository()
    const result = await handleWebhookPayload(repo, { foo: 'bar' })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when the referenced order does not exist', async () => {
    const repo = createInMemoryOrdersRepository()
    const result = await handleWebhookPayload(repo, {
      external_reference: 'no-existe',
      status: 'approved',
    })
    expect(result.ok).toBe(false)
  })
})

const { getOrdersRepositoryMock, inMemoryRepo } = vi.hoisted(() => {
  // The mock is assigned a fresh in-memory repo in beforeEach below; this
  // placeholder keeps the hoisted reference shape stable for vi.mock below.
  return {
    getOrdersRepositoryMock: vi.fn(),
    inMemoryRepo: { current: null as ReturnType<typeof createInMemoryOrdersRepository> | null },
  }
})

// route.ts ya no llama a createSupabaseOrdersRepository/createSupabaseServerClient
// directamente — usa el factory compartido getOrdersRepository (ver C1), así
// que mockeamos ese factory en lugar de los imports de Supabase. Esto asegura
// que el test ejercita el mismo punto de decisión que usan el checkout y el
// webhook en producción, en vez de enmascarar una posible divergencia entre
// ambos (el bug C1 original).
vi.mock('@/lib/orders/get-orders-repository', () => ({
  getOrdersRepository: getOrdersRepositoryMock,
}))

describe('POST /api/mercadopago/webhook', () => {
  const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    inMemoryRepo.current = createInMemoryOrdersRepository()
    getOrdersRepositoryMock.mockImplementation(async () => inMemoryRepo.current)
  })

  afterEach(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret
  })

  it('rejects a request with no secret query param with 401 and never touches the repository', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'correcto'

    const request = new NextRequest('http://localhost/api/mercadopago/webhook', {
      method: 'POST',
      body: JSON.stringify({ external_reference: 'order-1', status: 'approved' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(getOrdersRepositoryMock).not.toHaveBeenCalled()
  })

  it('rejects a request with the wrong secret with 401 and never touches the repository', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'correcto'

    const request = new NextRequest(
      'http://localhost/api/mercadopago/webhook?secret=incorrecto',
      {
        method: 'POST',
        body: JSON.stringify({ external_reference: 'order-1', status: 'approved' }),
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(getOrdersRepositoryMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a malformed JSON body and never touches the repository', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'correcto'

    const request = new NextRequest(
      'http://localhost/api/mercadopago/webhook?secret=correcto',
      {
        method: 'POST',
        body: 'not json',
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(getOrdersRepositoryMock).not.toHaveBeenCalled()
  })

  it('processes a request with the correct secret normally', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'correcto'

    const order = await inMemoryRepo.current!.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )

    const request = new NextRequest(
      'http://localhost/api/mercadopago/webhook?secret=correcto',
      {
        method: 'POST',
        body: JSON.stringify({ external_reference: order.id, status: 'approved' }),
      }
    )

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(getOrdersRepositoryMock).toHaveBeenCalledTimes(1)
  })
})
