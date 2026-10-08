'use client'

import { useEffect, useState } from 'react'
import type { CartItem } from '@/lib/cart/cart-types'
import { formatCurrencyARS } from '@/lib/format'

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState(String(item.quantity))

  // Sync draft when item.quantity changes (after parent commits update)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(String(item.quantity))
  }, [item.quantity])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)
    const parsed = Number(raw)
    if (raw === '' || !Number.isFinite(parsed)) return
    onUpdateQuantity(Math.max(1, Math.round(parsed)))
  }

  return (
    <div className="flex items-center gap-4 border-b border-secondary/20 py-4">
      <div>
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm text-text/70">{item.color}</p>
        <p className="text-sm">{formatCurrencyARS(item.unitPrice)}</p>
      </div>
      <input
        type="number"
        min={1}
        value={draft}
        aria-label={`Cantidad de ${item.name}`}
        onChange={handleChange}
        className="w-16 rounded-md bg-[#17171A] px-2 py-1 text-center"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${item.name} (${item.color})`}
        className="text-sm underline"
      >
        Quitar
      </button>
    </div>
  )
}
