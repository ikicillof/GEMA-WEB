import shippingZonesData from '@/data/shipping-zones.json'

export type ShippingZone = {
  id: string
  name: string
  rate: number
  order: number
}

const zones = shippingZonesData as ShippingZone[]

export function getShippingZones(): ShippingZone[] {
  return [...zones].sort((a, b) => a.order - b.order)
}

export function getShippingZoneById(id: string): ShippingZone | undefined {
  return zones.find((z) => z.id === id)
}

export function calculateShippingTotal(zoneId: string): number {
  const zone = getShippingZoneById(zoneId)
  if (!zone) {
    throw new Error(`calculateShippingTotal: unknown zone ${zoneId}`)
  }
  return zone.rate
}
