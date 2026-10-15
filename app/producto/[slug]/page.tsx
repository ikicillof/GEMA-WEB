import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProductDetail } from '@/components/product-detail'
import { ProductCard } from '@/components/product-card'
import { getProduct, products } from '@/lib/products'

export const dynamicParams = false
export function generateStaticParams() { return products.map(product => ({ slug: product.slug })) }

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug)
  if (!product) notFound()
  const related = products.filter(item => item.slug !== product.slug).slice(0, 4)
  return <><section className="product-page"><div className="shell"><div className="breadcrumbs"><Link href="/tienda">Tienda</Link><ArrowRight size={12} /><span>{product.name}</span></div><ProductDetail product={product} /></div></section><section className="section related"><div className="shell"><div className="section-head"><div><p className="section-kicker">Para seguir mirando</p><h2 className="section-title">También te<br /><em>puede gustar.</em></h2></div><Link href="/tienda" className="text-link"><ArrowLeft size={16} /> Volver a la tienda</Link></div><div className="related-grid">{related.map((item, index) => <ProductCard key={item.slug} product={item} index={index} />)}</div></div></section></>
}
