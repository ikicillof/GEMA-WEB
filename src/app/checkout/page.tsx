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
import { shouldRequireAuth } from '@/lib/auth/checkout-guard'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const router = useRouter()
  const { items } = useCart()
  const [zoneId, setZoneId] = useState(getShippingZones()[0]?.id ?? '')
  const [address, setAddress] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    if (!canStartCheckout(items)) {
      router.replace('/carrito')
    }
  }, [items, router])

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        setIsAuthenticated(Boolean(data.user))
        setCustomerEmail(data.user?.email ?? null)
        setCheckedAuth(true)
      })
  }, [])

  if (!canStartCheckout(items)) return null
  if (!checkedAuth) return <p className="px-4 py-10">Cargando...</p>

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

  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
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
        <p className="mt-6">
          Zona seleccionada: {zoneId}. (El paso de medio de pago se agrega en la Tarea 17.)
        </p>
      )}
    </div>
  )
}
