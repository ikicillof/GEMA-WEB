'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { formatCurrencyARS } from '@/lib/format'
import type { PaymentMethod } from '@/types/order'
import { confirmMercadoPagoOrder, confirmCashOrTransferOrder, getCheckoutSummary } from './actions'
import { LAST_ORDER_ID_KEY } from './confirmacion/ClearCartOnMount'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10">Cargando...</p>}>
      <CheckoutPageContent />
    </Suspense>
  )
}

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('status')
  const { items, isHydrated, clear } = useCart()
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
  const [summary, setSummary] = useState<{ total: number } | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  useEffect(() => {
    // Una vez confirmado el pedido (efectivo/transferencia), el carrito se
    // vacía a propósito (Fix I3) — no hay que tratar eso como "carrito
    // vacío, mandalo a /carrito": el pedido ya existe y hay que mostrarle
    // las instrucciones de pago.
    if (isHydrated && !confirmedOrder && !canStartCheckout(items)) {
      router.replace('/carrito')
    }
  }, [items, isHydrated, router, confirmedOrder])

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

  useEffect(() => {
    if (!isHydrated || items.length === 0) return
    const cartItems = items.map((i) => ({
      productId: i.productId,
      color: i.color,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }))
    getCheckoutSummary({ items: cartItems, shippingZoneId: zoneId, paymentMethod })
      .then((result) => {
        setSummary(result)
        setSummaryError(null)
      })
      .catch((error) => {
        console.error('getCheckoutSummary failed:', error)
        setSummaryError('No pudimos calcular el total.')
      })
  }, [items, zoneId, paymentMethod, isHydrated])

  if (!isHydrated || !checkedAuth) return <p className="px-4 py-10">Cargando...</p>
  if (!confirmedOrder && !canStartCheckout(items)) return null

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
        const { initPoint, orderId } = await confirmMercadoPagoOrder(orderInput)
        try {
          sessionStorage.setItem(LAST_ORDER_ID_KEY, orderId)
        } catch {
          // Si sessionStorage no está disponible, ClearCartOnMount
          // simplemente no vaciará el carrito al volver — es el fallback
          // seguro, no una falla crítica.
        }
        window.location.href = initPoint
        return
      }

      const order = await confirmCashOrTransferOrder(orderInput)
      clear()
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
      {paymentStatus === 'failure' && (
        <p role="alert" className="mb-4 text-primary">
          El pago no se pudo procesar. Tu carrito sigue acá — podés intentar de nuevo.
        </p>
      )}
      {paymentStatus === 'pending' && (
        <p role="alert" className="mb-4 text-primary">
          Tu pago está pendiente de confirmación. Te vamos a avisar por email cuando se acredite.
        </p>
      )}
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
      {!confirmedOrder && summary && (
        <p className="mt-4 text-lg font-semibold">Total: {formatCurrencyARS(summary.total)}</p>
      )}
      {!confirmedOrder && summaryError && (
        <p role="alert" className="mt-2 text-sm text-primary">
          {summaryError}
        </p>
      )}
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
