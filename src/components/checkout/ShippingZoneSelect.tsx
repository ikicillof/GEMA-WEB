'use client'

import type { ShippingZone } from '@/lib/shipping'

export function ShippingZoneSelect({
  zones,
  value,
  onChange,
}: {
  zones: ShippingZone[]
  value: string
  onChange: (zoneId: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Zona de envío</legend>
      {zones.map((zone) => (
        <label key={zone.id} className="mb-2 flex items-center gap-2">
          <input
            type="radio"
            name="shipping-zone"
            value={zone.id}
            checked={value === zone.id}
            onChange={() => onChange(zone.id)}
          />
          {zone.name} — {zone.rate === 0 ? 'Gratis' : `$${zone.rate}`}
        </label>
      ))}
    </fieldset>
  )
}
