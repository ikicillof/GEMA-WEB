'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/cart/CartProvider'

export const LAST_ORDER_ID_KEY = 'gemma_last_order_id'

// Solo vaciamos el carrito si este visitante acaba de pagar ESTE pedido en
// esta misma pestaña/sesión (marcado en sessionStorage justo antes de ir a
// Mercado Pago) — nunca por el solo hecho de visitar esta URL. Sin esto,
// alguien que guarda o reabre /checkout/confirmacion?order=X más tarde (o
// en otra pestaña con un carrito nuevo sin relación) perdería ese carrito
// sin haber comprado nada.
export function ClearCartOnMount({ orderId }: { orderId: string | undefined }) {
  const { clear, isHydrated } = useCart()

  useEffect(() => {
    // Esperar a que CartProvider termine de hidratar desde localStorage.
    // Si disparamos clear() antes, el CLEAR pega sobre el EMPTY_CART previo
    // a la hidratación y el HYDRATE que llega justo después lo pisa con el
    // carrito real sin vaciar — el mismo bug ya corregido en checkout/page.tsx.
    if (!isHydrated || !orderId) return
    try {
      const stashedOrderId = sessionStorage.getItem(LAST_ORDER_ID_KEY)
      if (stashedOrderId !== orderId) return
      sessionStorage.removeItem(LAST_ORDER_ID_KEY)
    } catch {
      // Si sessionStorage no está disponible (modo privado, etc.) no
      // podemos confirmar que este carrito corresponde al pedido recién
      // pagado — mejor no vaciarlo que arriesgar borrar el de otro.
      return
    }
    clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isHydrated])

  return null
}
