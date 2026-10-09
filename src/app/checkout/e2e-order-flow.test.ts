import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// Make sure no real Supabase env vars leak in from the test environment,
// so this exercises the dev-singleton fallback path deterministically.
beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

  // confirmCashOrTransferOrder (C4) ahora exige una sesión verificada del
  // lado del servidor; simulamos una sesión autenticada para que este test
  // siga probando lo que probaba antes (la persistencia del pedido, C1).
  vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { email: 'cliente@example.com' } } }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
})

describe('checkout → webhook order flow (end-to-end)', () => {
  it('an order created via confirmCashOrTransferOrder can be found and updated via the same repository the webhook uses', async () => {
    const { confirmCashOrTransferOrder } = await import('./actions')
    const { getOrdersRepository } = await import('@/lib/orders/get-orders-repository')
    const { handleWebhookPayload } = await import('../api/mercadopago/webhook/route')

    const order = await confirmCashOrTransferOrder({
      items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
      shippingZoneId: 'caba',
      paymentMethod: 'transferencia',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    })

    const repo = await getOrdersRepository()
    const found = await repo.getOrder(order.id)
    expect(found).not.toBeNull()
    expect(found?.paymentStatus).toBe('pendiente')

    const result = await handleWebhookPayload(repo, {
      external_reference: order.id,
      status: 'approved',
    })
    expect(result.ok).toBe(true)

    const updated = await repo.getOrder(order.id)
    expect(updated?.paymentStatus).toBe('pagado')
  })
})
