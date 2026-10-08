import { computeTransferPrice } from '@/lib/pricing'
import { formatCurrencyARS } from '@/lib/format'

export function TransferPriceBadge({ price }: { price: number }) {
  const transferPrice = computeTransferPrice(price)
  return (
    <span className="inline-flex items-center rounded-full bg-rest px-3 py-1 text-xs font-semibold text-bg shadow-[var(--shadow-sticker)]">
      {formatCurrencyARS(transferPrice)} x transferencia <span aria-hidden="true">💸</span>
    </span>
  )
}
