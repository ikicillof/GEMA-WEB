import type { Product } from '@/types/product'
import { Hero } from './Hero'
import { FeaturedProducts } from './FeaturedProducts'
import { TrustBannerRow } from '@/components/ui/TrustBannerRow'

export function HomeView({ featuredProducts }: { featuredProducts: Product[] }) {
  return (
    <main>
      <Hero />
      <div className="px-4 md:px-10">
        <TrustBannerRow
          items={[
            { icon: '📦', label: 'Envíos a todo el país', tone: 'rest' },
            { icon: '🏠', label: 'Comprá sin salir de tu casa', tone: 'cool' },
            { icon: '💳', label: 'Hasta 12 cuotas', tone: 'warm' },
            { icon: '🔒', label: 'Compra segura', tone: 'rest' },
          ]}
        />
      </div>
      <FeaturedProducts products={featuredProducts} />
    </main>
  )
}
