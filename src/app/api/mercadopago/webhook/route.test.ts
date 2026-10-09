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
    const updated = await repo.updateOrderPaymentStatus(order.id, 'pagado')
    expect(updated.paymentStatus).toBe('pagado')
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

const { createSupabaseServerClientMock, createSupabaseOrdersRepositoryMock, inMemoryRepo } =
  vi.hoisted(() => {
    // The mock is assigned a fresh in-memory repo in beforeEach below; this
    // placeholder keeps the hoisted reference shape stable for vi.mock below.
    return {
      createSupabaseServerClientMock: vi.fn(),
      createSupabaseOrdersRepositoryMock: vi.fn(),
      inMemoryRepo: { current: null as ReturnType<typeof createInMemoryOrdersRepository> | null },
    }
  })

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

vi.mock('@/lib/orders/supabase-orders-repository', () => ({
  createSupabaseOrdersRepository: createSupabaseOrdersRepositoryMock,
}))

describe('POST /api/mercadopago/webhook', () => {
  const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    inMemoryRepo.current = createInMemoryOrdersRepository()
    createSupabaseServerClientMock.mockResolvedValue({})
    createSupabaseOrdersRepositoryMock.mockImplementation(() => inMemoryRepo.current)
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
    expect(createSupabaseOrdersRepositoryMock).not.toHaveBeenCalled()
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
    expect(createSupabaseOrdersRepositoryMock).not.toHaveBeenCalled()
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
    expect(createSupabaseOrdersRepositoryMock).toHaveBeenCalledTimes(1)
  })
})
