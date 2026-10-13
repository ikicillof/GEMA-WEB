import { DeliveryMap } from '@/components/delivery-map'
import { ShopClient } from '@/components/shop-client'
import { products } from '@/lib/products'

export default function StorePage() {
  return <><section className="page-hero"><div className="shell page-hero-inner"><div><p className="section-kicker">Todo el universo Gemma</p><h1 className="page-title">La tienda que{' '}<br /><span style={{ color: '#FF4DA6' }}>levanta</span> rincones.</h1></div><p className="page-hero-copy">Piezas impresas en 3D, hechas a pedido y disponibles en una paleta que no se queda quieta.</p></div></section><section className="section"><div className="shell"><ShopClient products={products} /></div></section><DeliveryMap /></>
}
