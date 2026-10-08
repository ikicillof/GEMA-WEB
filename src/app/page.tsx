import { getAllProducts } from '@/lib/catalog'
import { HomeView } from '@/components/home/HomeView'

export default async function Page() {
  const featuredProducts = getAllProducts().slice(0, 3)
  return <HomeView featuredProducts={featuredProducts} />
}
