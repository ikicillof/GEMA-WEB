'use client'

import Link from 'next/link'
import { useCart } from './CartProvider'
import { CartItemRow } from './CartItemRow'
import { formatCurrencyARS } from '@/lib/format'
import { computeTransferPrice } from '@/lib/pricing'

export function CartView() {
  const { items, updateQuantity, removeItem } = useCart()

  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center md:px-10">
        <p className="mb-4">Todavía no agregaste nada a tu carrito.</p>
        <Link href="/" className="underline">
          Ver productos
        </Link>
      </div>
    )
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const transferTotal = computeTransferPrice(total)

  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Tu carrito</h1>
      {items.map((item) => (
        <CartItemRow
          key={`${item.productId}-${item.color}`}
          item={item}
          onUpdateQuantity={(quantity) => updateQuantity(item.productId, item.color, quantity)}
          onRemove={() => removeItem(item.productId, item.color)}
        />
      ))}
      <p className="mt-6 text-lg font-semibold">Total: {formatCurrencyARS(total)}</p>
      <p className="text-sm text-text/70">Total por transferencia: {formatCurrencyARS(transferTotal)}</p>
      <Link
        href="/checkout"
        className="mt-4 inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
      >
        Ir a pagar
      </Link>
    </div>
  )
}
