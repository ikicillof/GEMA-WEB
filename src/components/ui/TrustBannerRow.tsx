import { TrustBanner } from './TrustBanner'

type TrustBannerItem = {
  icon: React.ReactNode
  label: string
  tone: 'rest' | 'cool' | 'warm'
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
