import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/catalog'
import { ProductDetailView } from '@/components/product/ProductDetailView'
import { buildProductJsonLd, serializeJsonLd } from '@/lib/seo/json-ld'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return {}
  return {
    title: `${product.name} — Gemma`,
    description: product.description,
  }
}

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gemma.ar'
  const url = `${baseUrl}/producto/${product.slug}`
  const jsonLd = buildProductJsonLd(product, url)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ProductDetailView product={product} />
    </>
  )
}
