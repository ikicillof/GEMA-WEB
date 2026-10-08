import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/catalog'
import { ProductDetailView } from '@/components/product/ProductDetailView'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return <ProductDetailView product={product} />
}
