import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { imagenParaCompartir, jsonLdMigas, jsonLdProducto, metaPagina, resumen } from '@/lib/seo'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProductDetail } from '@/components/product-detail'
import { ProductCard } from '@/components/product-card'
import { getProducto, getProductos } from '@/lib/server/catalogo'

// La ficha se arma en el servidor en cada pedido (los datos salen de la caché de catálogo, no de Firestore directo).
// No se usa ISR acá: en Next 14 una ficha que dio 404 (producto oculto) quedaba en 404 aunque se reactivara.
export const dynamic = 'force-dynamic'

/** Descripción para buscadores: la del producto; si todavía no la cargaron en el panel, una frase genérica (completarla en el panel: ver docs/estado-backend.md). */
const descripcionDe = (p: { name: string; description: string }) =>
  resumen(p.description.trim() || `${p.name}: pieza de diseño impresa en 3D por Gemma, hecha a pedido en el color que elegís.`)

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProducto(params.slug)
  if (!product) return { title: 'Producto no encontrado', robots: { index: false, follow: false } }
  return metaPagina({ titulo: product.name, descripcion: descripcionDe(product), ruta: `/producto/${product.slug}`, imagen: imagenParaCompartir(product.images[0]) })
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProducto(params.slug)
  if (!product) notFound()
  const related = (await getProductos()).filter(item => item.slug !== product.slug).slice(0, 4)
  return <><JsonLd datos={[
    jsonLdProducto({ slug: product.slug, name: product.name, description: descripcionDe(product), price: product.price, images: product.images }),
    jsonLdMigas([{ nombre: 'Inicio', ruta: '/' }, { nombre: 'Tienda', ruta: '/tienda' }, { nombre: product.name, ruta: `/producto/${product.slug}` }]),
  ]} /><section className="product-page"><div className="shell"><div className="breadcrumbs"><Link href="/tienda">Tienda</Link><ArrowRight size={12} /><span>{product.name}</span></div><ProductDetail product={product} /></div></section><section className="section related"><div className="shell"><div className="section-head"><div><p className="section-kicker">Para seguir mirando</p><h2 className="section-title">También te<br /><em>puede gustar.</em></h2></div><Link href="/tienda" className="text-link"><ArrowLeft size={16} /> Volver a la tienda</Link></div><div className="related-grid">{related.map((item, index) => <ProductCard key={item.slug} product={item} index={index} />)}</div></div></section></>
}
