import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Page from './page'
import { CartProvider } from '@/components/cart/CartProvider'
import * as cartStorage from '@/lib/cart/cart-storage'
import * as supabaseClient from '@/lib/supabase/client'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
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
    await waitFor(() =>
      expect(screen.getByText(/paso de medio de pago/i)).toBeInTheDocument()
    )
    expect(screen.queryByText(/Enviarme el código para pagar/i)).not.toBeInTheDocument()
  })
})
