import { formatCurrencyARS } from '@/lib/format'

export function TransferInstructions({
  orderId,
  total,
}: {
  orderId: string
  total: number
}) {
  return (
    <div className="rounded-lg bg-[#17171A] p-6">
      <p className="mb-2 font-semibold">¡Ya casi! Tu pedido es #{orderId}</p>
      <p className="mb-4">
        Transferí {formatCurrencyARS(total)} y mandanos el comprobante a
        somosgemma.ar@gmail.com. En cuanto lo veamos, preparamos tu pedido 💌
      </p>
      <p className="text-sm text-text/70">Alias: gemma.tienda</p>
    </div>
  )
}
