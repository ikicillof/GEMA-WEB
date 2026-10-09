import { describe, it, expect, beforeEach, vi } from 'vitest'
import { confirmCashOrTransferOrder, confirmMercadoPagoOrder, getCheckoutSummary } from './actions'
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

  // I5: el servidor no validaba disponibilidad de producto/color ni que la
  // cantidad fuera un entero positivo. repriceItems ya hacía el lookup del
  // producto para repricear — estos tests verifican que ese mismo lookup
  // ahora también rechaza items sold-out o con cantidades inválidas, lo cual
  // cierra el bypass de llamar al Server Action directamente (o tamperear
  // localStorage) para pedir algo no disponible.
  it('rejects an order for a product that is marked fully unavailable', async () => {
    const input: OrderInput = {
      items: [{ productId: 'porta-llaves-ondas', color: 'Rosa Gemma', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'efectivo',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    await expect(confirmCashOrTransferOrder(input)).rejects.toThrow(/no disponible/)
  })

  it('rejects an order for a color that is not available on an otherwise available product', async () => {
    const input: OrderInput = {
      items: [{ productId: lumalee.id, color: 'Amarillo', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'efectivo',
      customerEmail: 'cliente@example.com',
      address: 'Calle Falsa 123',
    }

    await expect(confirmCashOrTransferOrder(input)).rejects.toThrow(/[Cc]olor no disponible/)
  })

  it('rejects an order with an invalid quantity (zero, negative, or non-integer)', async () => {
    for (const badQuantity of [0, -1, 2.5]) {
      const input: OrderInput = {
        items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: badQuantity, unitPrice: 1 }],
        shippingZoneId: 'caba',
        paymentMethod: 'efectivo',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      }

      await expect(confirmCashOrTransferOrder(input)).rejects.toThrow(/[Cc]antidad inválida/)
    }
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

// I4: el checkout no mostraba ningún precio antes de confirmar. getCheckoutSummary
// es la Server Action que el cliente llama para previsualizar el total — repricea
// igual que las acciones que sí crean el pedido, pero es de solo lectura.
describe('getCheckoutSummary (read-only price preview, no auth or order creation)', () => {
  it('reprices a known cart/zone/payment-method combination and returns the correct total', async () => {
    const result = await getCheckoutSummary({
      items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: 2, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'transferencia',
    })

    const expectedUnitPrice = computeTransferPrice(lumalee.price)
    expect(result.items[0].unitPrice).toBe(expectedUnitPrice)
    expect(result.shippingTotal).toBe(3500) // "caba" rate
    expect(result.total).toBe(expectedUnitPrice * 2 + 3500)
  })

  it('does NOT require an authenticated session (unlike the order-creating actions)', async () => {
    vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await getCheckoutSummary({
      items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: 1, unitPrice: 1 }],
      shippingZoneId: 'caba',
      paymentMethod: 'mercado_pago',
    })

    expect(result.total).toBe(lumalee.price + 3500)
    expect(supabaseServer.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('does not create an order (never touches the orders repository)', async () => {
    const repoModule = await import('@/lib/orders/get-orders-repository')
    const spy = vi.spyOn(repoModule, 'getOrdersRepository')

    try {
      await getCheckoutSummary({
        items: [{ productId: lumalee.id, color: 'Rosa Gemma', quantity: 1, unitPrice: 1 }],
        shippingZoneId: 'caba',
        paymentMethod: 'efectivo',
      })

      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('rejects when the cart references a productId that does not exist in the catalog', async () => {
    await expect(
      getCheckoutSummary({
        items: [{ productId: 'producto-inventado', color: 'N/A', quantity: 1, unitPrice: 1 }],
        shippingZoneId: 'caba',
        paymentMethod: 'efectivo',
      })
    ).rejects.toThrow('Producto desconocido: producto-inventado')
  })
})
