import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Page from './page'
import { CartProvider } from '@/components/cart/CartProvider'
import * as cartStorage from '@/lib/cart/cart-storage'
import * as supabaseClient from '@/lib/supabase/client'
import * as checkoutActions from './actions'

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('./actions', () => ({
  confirmMercadoPagoOrder: vi.fn(),
  confirmCashOrTransferOrder: vi.fn(),
}))

const availableItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

const unavailableColorItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Amarillo',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

function mockAuth(user: { email: string } | null) {
  vi.mocked(supabaseClient.createSupabaseBrowserClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('blocks checkout with a message when a cart item is no longer available', async () => {
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({ items: [unavailableColorItem] })
    mockAuth(null)

    render(
      <CartProvider>
        <Page />
      </CartProvider>
    )

    expect(await screen.findByText(/ya no están disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/Lámpara Lumalee \(Amarillo\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Zona de envío/i)).not.toBeInTheDocument()
  })

  it('shows the login form (auth gate) at the payment step when not authenticated', async () => {
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({ items: [availableItem] })
    mockAuth(null)

    render(
      <CartProvider>
        <Page />
      </CartProvider>
    )

    expect(await screen.findByText(/Zona de envío/i)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/Enviarme el código para pagar/i)).toBeInTheDocument()
    )
  })

  it('skips the login form when already authenticated', async () => {
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({ items: [availableItem] })
    mockAuth({ email: 'cliente@example.com' })

    render(
      <CartProvider>
        <Page />
      </CartProvider>
    )

    expect(await screen.findByText(/Zona de envío/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Medio de pago/i)).toBeInTheDocument())
    expect(screen.queryByText(/Enviarme el código para pagar/i)).not.toBeInTheDocument()
  })

  it('never redirects to /carrito when the cart hydrates with real items (hydration race regression)', async () => {
    // Regression for the hydration race: CartProvider starts at EMPTY_CART and only
    // loads the real cart inside its own mount effect. Before the isHydrated guard,
    // CheckoutPage's redirect effect ran with items === [] on the very first check and
    // sent a shopper with a non-empty cart back to /carrito.
    vi.spyOn(cartStorage, 'loadCart').mockReturnValue({ items: [availableItem] })
    mockAuth(null)

    render(
      <CartProvider>
        <Page />
      </CartProvider>
    )

    // Wait for the page to finish hydrating and rendering the real checkout content.
    expect(await screen.findByText(/Zona de envío/i)).toBeInTheDocument()

    expect(replaceMock).not.toHaveBeenCalledWith('/carrito')
  })

  describe('payment confirmation', () => {
    async function renderAuthenticatedCheckout() {
      vi.spyOn(cartStorage, 'loadCart').mockReturnValue({ items: [availableItem] })
      mockAuth({ email: 'cliente@example.com' })

      render(
        <CartProvider>
          <Page />
        </CartProvider>
      )

      expect(await screen.findByText(/Medio de pago/i)).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText(/Dirección de entrega/i), {
        target: { value: 'Calle Falsa 123' },
      })
    }

    it('sends the raw cart unitPrice to confirmCashOrTransferOrder when confirming with Transferencia', async () => {
      // El descuento por transferencia ahora se calcula en el servidor
      // (confirmCashOrTransferOrder / repriceItems), no en page.tsx. El cliente
      // solo manda el unitPrice crudo del carrito y muestra lo que el server
      // devuelve.
      vi.mocked(checkoutActions.confirmCashOrTransferOrder).mockResolvedValue({
        id: 'order-1',
        total: 32300,
      })

      await renderAuthenticatedCheckout()

      fireEvent.click(screen.getByLabelText(/Transferencia \(10% off\)/i))
      fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }))

      expect(await screen.findByText(/32\.300/)).toBeInTheDocument()
      expect(checkoutActions.confirmMercadoPagoOrder).not.toHaveBeenCalled()

      const call = vi.mocked(checkoutActions.confirmCashOrTransferOrder).mock.calls[0][0]
      expect(call.items[0].unitPrice).toBe(availableItem.unitPrice)
    })

    it('sends the raw cart unitPrice to confirmMercadoPagoOrder when confirming with Mercado Pago', async () => {
      vi.mocked(checkoutActions.confirmMercadoPagoOrder).mockResolvedValue({
        initPoint: 'https://mercadopago.example.com/pay/order-1',
      })

      await renderAuthenticatedCheckout()

      // 'mercado_pago' is already the default selection.
      fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }))

      await waitFor(() => expect(checkoutActions.confirmMercadoPagoOrder).toHaveBeenCalled())
      const call = vi.mocked(checkoutActions.confirmMercadoPagoOrder).mock.calls[0][0]
      expect(call.items[0].unitPrice).toBe(availableItem.unitPrice)
    })

    it('shows a confirmError alert and re-enables the button when confirmation fails', async () => {
      vi.mocked(checkoutActions.confirmMercadoPagoOrder).mockRejectedValue(
        new Error('Mercado Pago no respondió')
      )

      await renderAuthenticatedCheckout()

      const confirmButton = screen.getByRole('button', { name: /Confirmar pedido/i })
      fireEvent.click(confirmButton)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /No pudimos confirmar tu pedido/i
      )
      expect(screen.getByRole('button', { name: /Confirmar pedido/i })).not.toBeDisabled()
    })
  })
})
