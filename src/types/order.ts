export type PaymentMethod = 'mercado_pago' | 'transferencia' | 'efectivo'
export type PaymentStatus = 'pendiente' | 'pagado' | 'rechazado'
export type ShippingStatus = 'a_confirmar' | 'enviado'

export type OrderItem = {
  productId: string
  color: string
  quantity: number
  unitPrice: number
}

export type OrderInput = {
  items: OrderItem[]
  shippingZoneId: string
  paymentMethod: PaymentMethod
  customerEmail: string
  address: string
}

export type Order = OrderInput & {
  id: string
  total: number
  paymentStatus: PaymentStatus
  shippingStatus: ShippingStatus
  createdAt: string
}
