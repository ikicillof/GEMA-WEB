'use client'

import type { PaymentMethod } from '@/types/order'

const options: { value: PaymentMethod; label: string }[] = [
  { value: 'mercado_pago', label: 'Mercado Pago (tarjetas, hasta 12 cuotas)' },
  { value: 'transferencia', label: 'Transferencia (10% off)' },
  { value: 'efectivo', label: 'Efectivo, retiro en Vicente López (10% off)' },
]

export function PaymentMethodSelect({
  value,
  onChange,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Medio de pago</legend>
      {options.map((option) => (
        <label key={option.value} className="mb-2 flex items-center gap-2">
          <input
            type="radio"
            name="payment-method"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
