import type { ReactNode } from 'react'
import { TrustBanner, type Tone } from './TrustBanner'

type TrustBannerItem = {
  icon: ReactNode
  label: string
  tone: Tone
}

export function TrustBannerRow({ items }: { items: TrustBannerItem[] }) {
  return (
    <ul className="flex gap-3 overflow-x-auto py-2 md:flex-wrap md:overflow-visible">
      {items.map((item) => (
        <TrustBanner key={item.label} {...item} />
      ))}
    </ul>
  )
}
