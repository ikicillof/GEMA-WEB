import type { Order, PaymentStatus } from '@/types/order'

export type PreferenceItem = {
  title: string
  quantity: number
  unit_price: number
  currency_id: 'ARS'
}

export type PreferencePayload = {
  items: PreferenceItem[]
  external_reference: string
  back_urls: { success: string; failure: string; pending: string }
}

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_SITE_URL')
  }
  return url
}

export function buildPreferencePayload(order: Order): PreferencePayload {
  const siteUrl = getSiteUrl()
  return {
    items: order.items.map((item) => ({
      title: `${item.productId} (${item.color})`,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: 'ARS',
    })),
    external_reference: order.id,
    back_urls: {
      success: `${siteUrl}/checkout/confirmacion?order=${order.id}`,
      failure: `${siteUrl}/checkout?order=${order.id}&status=failure`,
      pending: `${siteUrl}/checkout?order=${order.id}&status=pending`,
    },
  }
}

export function mapMercadoPagoStatusToOrderStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'pagado'
    case 'rejected':
      return 'rechazado'
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pendiente'
    default:
      console.warn(
        `mapMercadoPagoStatusToOrderStatus: unrecognized Mercado Pago status "${mpStatus}", treating as pendiente`
      )
      return 'pendiente'
  }
}

export function parseWebhookPayload(raw: unknown): { orderId: string; mpStatus: string } | null {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'external_reference' in raw &&
    'status' in raw &&
    typeof (raw as Record<string, unknown>).external_reference === 'string' &&
    typeof (raw as Record<string, unknown>).status === 'string'
  ) {
    return {
      orderId: (raw as Record<string, string>).external_reference,
      mpStatus: (raw as Record<string, string>).status,
    }
  }
  return null
}

export async function createPreference(
  payload: PreferencePayload,
  accessToken: string
): Promise<{ init_point: string }> {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`createPreference failed: ${response.status}`)
  }
  return response.json()
}
