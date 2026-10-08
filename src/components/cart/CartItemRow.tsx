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
        value={item.quantity}
        aria-label={`Cantidad de ${item.name}`}
        onChange={(e) => onUpdateQuantity(Number(e.target.value))}
        className="w-16 rounded-md bg-[#17171A] px-2 py-1 text-center"
      />
      <button type="button" onClick={onRemove} className="text-sm underline">
        Quitar
      </button>
    </div>
  )
}
