'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartProvider'
import { canStartCheckout, findUnavailableItems } from '@/lib/checkout/guards'
import { getAllProducts } from '@/lib/catalog'
import { getShippingZones } from '@/lib/shipping'
import { ShippingZoneSelect } from '@/components/checkout/ShippingZoneSelect'
import { LoginForm } from '@/components/checkout/LoginForm'
import { PaymentMethodSelect } from '@/components/checkout/PaymentMethodSelect'
import { TransferInstructions } from '@/components/checkout/TransferInstructions'
import { shouldRequireAuth } from '@/lib/auth/checkout-guard'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { PaymentMethod } from '@/types/order'
import { confirmMercadoPagoOrder, confirmCashOrTransferOrder } from './actions'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, isHydrated } = useCart()
  const [zoneId, setZoneId] = useState(getShippingZones()[0]?.id ?? '')
  const [address, setAddress] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercado_pago')
  const [unavailableWarning, setUnavailableWarning] = useState<string | null>(null)
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number } | null>(
    null
  )
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (isHydrated && !canStartCheckout(items)) {
      router.replace('/carrito')
    }
  }, [items, isHydrated, router])

  useEffect(() => {
    let isMounted = true
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!isMounted) return
        setIsAuthenticated(Boolean(data.user))
        setCustomerEmail(data.user?.email ?? null)
        setCheckedAuth(true)
      })
      .catch(() => {
        if (!isMounted) return
        setAuthError('No pudimos verificar tu sesión. Recargá la página para reintentar.')
        setCheckedAuth(true)
      })
    return () => {
      isMounted = false
    }
  }, [])

  if (!isHydrated || !checkedAuth) return <p className="px-4 py-10">Cargando...</p>
  if (!canStartCheckout(items)) return null

  const unavailableItems = findUnavailableItems(items, getAllProducts())

  if (unavailableItems.length > 0) {
    return (
      <div className="px-4 py-10 md:px-10">
        <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
        <p className="mb-4">
          Algunos productos de tu carrito ya no están disponibles:{' '}
          {unavailableItems.map((item) => `${item.name} (${item.color})`).join(', ')}.
          Volvé al carrito para quitarlos antes de continuar.
        </p>
        <Link href="/carrito" className="underline">
          Volver al carrito
        </Link>
      </div>
    )
  }

  const requiresAuth = shouldRequireAuth('payment', isAuthenticated)

  async function handleConfirm() {
    setConfirmError(null)
    setUnavailableWarning(null)

    if (!address.trim()) {
      setUnavailableWarning('Ingresá una dirección de entrega para continuar.')
      return
    }

    if (!customerEmail) {
      // No debería poder llegar acá: requiresAuth ya bloqueó este paso hasta
      // que shouldRequireAuth('payment', isAuthenticated) sea false, lo cual
      // solo pasa después de un verifyOtp exitoso que sí trae el email.
      setUnavailableWarning('No pudimos confirmar tu sesión. Volvé a iniciar sesión.')
      return
    }

    const products = getAllProducts()
    const unavailable = findUnavailableItems(items, products)
    if (unavailable.length > 0) {
      setUnavailableWarning(
        `"${unavailable[0].name}" en color ${unavailable[0].color} ya no está disponible. Quitalo del carrito para continuar.`
      )
      return
    }

    const cartItems = items.map((i) => ({
      productId: i.productId,
      color: i.color,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }))

    const orderInput = {
      items: cartItems,
      shippingZoneId: zoneId,
      paymentMethod,
      customerEmail,
      address,
    }

    setIsConfirming(true)
    try {
      if (paymentMethod === 'mercado_pago') {
        const { initPoint } = await confirmMercadoPagoOrder(orderInput)
        window.location.href = initPoint
        return
      }

      const order = await confirmCashOrTransferOrder(orderInput)
      setConfirmedOrder(order)
    } catch (error) {
      console.error('handleConfirm failed:', error)
      setConfirmError('No pudimos confirmar tu pedido. Probá de nuevo en un momento.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
      {authError && (
        <p role="alert" className="mb-4 text-sm text-primary">
          {authError}
        </p>
      )}
      <label className="mb-6 block">
        <span className="mb-2 block font-semibold">Dirección de entrega</span>
        <input
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, piso/depto, ciudad"
          className="w-full rounded-md bg-[#17171A] px-3 py-2"
        />
      </label>
      <ShippingZoneSelect zones={getShippingZones()} value={zoneId} onChange={setZoneId} />
      {requiresAuth ? (
        <div className="mt-6">
          <LoginForm
            onAuthenticated={(email) => {
              setIsAuthenticated(true)
              setCustomerEmail(email)
            }}
          />
        </div>
      ) : (
        <div className="mt-6">
          {confirmedOrder ? (
            <TransferInstructions orderId={confirmedOrder.id} total={confirmedOrder.total} />
          ) : (
            <>
              <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
              {unavailableWarning && (
                <p role="alert" className="text-primary">
                  {unavailableWarning}
                </p>
              )}
              {confirmError && (
                <p role="alert" className="mt-2 text-sm text-primary">
                  {confirmError}
                </p>
              )}
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="mt-4 rounded-full bg-primary px-7 py-3.5 font-semibold text-text disabled:opacity-60"
              >
                {isConfirming ? 'Confirmando...' : 'Confirmar pedido'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
