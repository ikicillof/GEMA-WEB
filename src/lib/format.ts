const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatCurrencyARS(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatCurrencyARS: invalid value ${value}`)
  }
  return arsFormatter.format(value)
}
