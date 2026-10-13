import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ShopClient } from '@/components/shop-client'
import { products } from '@/lib/products'
import { GemmaStar } from '@/components/gemma-ornament'

export default function StorePage() {
  return <><section className="page-hero"><div className="shell page-hero-inner"><div><p className="section-kicker">Todo el universo Gemma</p><h1 className="page-title">La tienda que{' '}<br /><span style={{ color: '#FF4DA6' }}>levanta</span> rincones.</h1></div><p className="page-hero-copy">Piezas impresas en 3D, hechas a pedido y disponibles en una paleta que no se queda quieta.</p></div></section><section className="section"><div className="shell"><ShopClient products={products} /><div className="notice-strip"><span className="notice-star"><GemmaStar size={18} /></span><span>Todos los productos se fabrican a pedido. Demora estimada: 7 a 14 días hábiles desde la confirmación del pedido. <Link href="/contacto" style={{ fontWeight:700 }}>¿Tenés una duda?</Link></span></div></div></section></>
}
