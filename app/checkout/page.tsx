import type { Metadata } from 'next'
import { CheckoutClient } from '@/components/checkout-client'

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false, follow: false } }

export default function CheckoutPage() {
  return <CheckoutClient />
}
