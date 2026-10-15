import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProductDetail } from '@/components/product-detail'
import { ProductCard } from '@/components/product-card'
import { getProducto, getProductos } from '@/lib/server/catalogo'

// La ficha se arma en el servidor en cada pedido (los datos salen de la caché de catálogo, no de Firestore directo).
// No se usa ISR acá: en Next 14 una ficha que dio 404 (producto oculto) quedaba en 404 aunque se reactivara.
export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProducto(params.slug)
  if (!product) notFound()
  const related = (await getProductos()).filter(item => item.slug !== product.slug).slice(0, 4)
  return <><section className="product-page"><div className="shell"><div className="breadcrumbs"><Link href="/tienda">Tienda</Link><ArrowRight size={12} /><span>{product.name}</span></div><ProductDetail product={product} /></div></section><section className="section related"><div className="shell"><div className="section-head"><div><p className="section-kicker">Para seguir mirando</p><h2 className="section-title">También te<br /><em>puede gustar.</em></h2></div><Link href="/tienda" className="text-link"><ArrowLeft size={16} /> Volver a la tienda</Link></div><div className="related-grid">{related.map((item, index) => <ProductCard key={item.slug} product={item} index={index} />)}</div></div></section></>
}
