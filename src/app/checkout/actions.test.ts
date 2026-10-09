import { describe, it, expect, beforeEach, vi } from 'vitest'
import { confirmCashOrTransferOrder, confirmMercadoPagoOrder } from './actions'
import { getAllProducts } from '@/lib/catalog'
import { computeTransferPrice } from '@/lib/pricing'
import * as supabaseServer from '@/lib/supabase/server'
import type { OrderInput } from '@/types/order'

// El reviewer encontró que el cliente controlaba el precio pagado: el carrito
// (en localStorage, editable en devtools) mandaba unitPrice directo al Server
// Action. Estos tests verifican que el servidor ignora ese valor y siempre
// recalcula desde el catálogo real (src/data/products.json) antes de crear
// cualquier pedido.

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// El reviewer también encontró que estos Server Actions no verificaban
// sesión del lado del servidor (C4). Simulamos una sesión autenticada para
// que los tests de repricing sigan probando lo que probaban antes; el test
// dedicado más abajo prueba el gate de autenticación en sí.
beforeEach(() => {
  vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { email: 'cliente@example.com' } } }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
})

const lumalee = getAllProducts().find((p) => p.id === 'lumalee')
if (!lumalee) {
  throw new Error('Producto de prueba "lumalee" no encontrado en el catálogo')
}

describe('confirmCashOrTransferOrder (repricing)', () => {
  it('ignores a tampered client unitPrice and charges the real catalog price with the transfer discount', async () => {
    const tamperedInput: OrderInput = {
      items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'transferencia',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    const order = await confirmCashOrTransferOrder(tamperedInput)

    const expectedUnitPrice = computeTransferPrice(lumalee.price)
    const expectedTotal = expectedUnitPrice * 1 + 3500 // shipping "caba" rate
    expect(order.total).toBe(expectedTotal)
    // Sanity check: the tampered price (1) must NOT have been used.
    expect(order.total).not.toBe(1 + 3500)
  })

  it('rejects when the cart references a productId that does not exist in the catalog', async () => {
    const input: OrderInput = {
      items: [{ productId: 'producto-inventado', color: 'N/A', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'efectivo',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    await expect(confirmCashOrTransferOrder(input)).rejects.toThrow(
      'Producto desconocido: producto-inventado'
    )
  })

  it('rejects when there is no authenticated session', async () => {
    vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const tamperedInput: OrderInput = {
      items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'transferencia',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    await expect(confirmCashOrTransferOrder(tamperedInput)).rejects.toThrow(
      'Necesitás iniciar sesión'
    )
  })
})

describe('confirmMercadoPagoOrder (repricing happens before the network call)', () => {
  // No tenemos credenciales reales de Mercado Pago en este entorno, así que no
  // probamos el flujo completo (igual que createPreference en la Tarea 17).
  // Lo que sí podemos verificar es que el repricing corre ANTES de llamar a
  // createPreference: un productId desconocido debe rechazar con el mismo
  // error que confirmCashOrTransferOrder, sin llegar nunca a hacer fetch.
  it('rejects with the same "Producto desconocido" error for an unknown productId', async () => {
    const input: OrderInput = {
      items: [{ productId: 'producto-inventado', color: 'N/A', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'mercado_pago',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    await expect(confirmMercadoPagoOrder(input)).rejects.toThrow(
      'Producto desconocido: producto-inventado'
    )
  })
})
