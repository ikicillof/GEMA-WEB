import { notFound } from 'next/navigation'
import { getCategoryBySlug, getProductsByCategory } from '@/lib/catalog'
import { CategoryListingView } from '@/components/catalog/CategoryListingView'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const products = getProductsByCategory(slug)

  return <CategoryListingView category={category} products={products} />
}
