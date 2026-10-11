import Link from 'next/link'
import { ArrowRight, Instagram, Mail, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { HomeIntro } from '@/components/home-intro'
import { GemmaStar } from '@/components/gemma-ornament'
import { GemmaExperienceLoader } from '@/components/gemma-experience-loader'
import { ProductCard } from '@/components/product-card'
import { products } from '@/lib/products'

export default function HomePage() {
  const featured = products.filter(product => product.featured)
  return <>
    <GemmaExperienceLoader />
    <div className="marquee"><div className="marquee-track">{Array.from({ length: 4 }).map((_, i) => <span key={i}>Hecho a pedido <b><GemmaStar size={12} /></b> Impreso en 3D <b><GemmaStar size={12} /></b> Elegís el color <b><GemmaStar size={12} /></b> Para que ahora sí quede lindo <b><GemmaStar size={12} /></b></span>)}</div></div>
    <HomeIntro />
    <section className="section section--dark" id="destacados"><div className="shell featured-shell"><div className="section-head"><div><p className="section-kicker">Los que levantan cualquier rincón</p><h2 className="section-title">Elegidos de<br /><em>Gemma.</em></h2></div><Link href="/tienda" className="text-link" style={{ color: '#FFB4DB' }}>Ver toda la tienda <ArrowRight size={17} /></Link></div><div className="products-grid featured-products">{featured.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div></div></section>
    <section className="section"><div className="shell"><div className="contact-block"><div className="contact-grid"><div><p className="section-kicker" style={{ color: '#FFD93D' }}>¿Vemos tu rincón?</p><h2 className="section-title">Hablemos de<br /><em>color.</em></h2><p className="contact-copy">Si tenés una pregunta, querés ver un color o simplemente encontraste algo que te encantó, escribinos. Gemi siempre está buscando el próximo rincón apagado.</p><div className="contact-actions"><a className="contact-action" href="https://wa.me/5491128397462?text=Hola%20Gemma%2C%20quiero%20consultar%20por%20un%20producto." target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a><a className="contact-action" href="https://instagram.com/ivankicillof_" target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a><a className="contact-action" href="mailto:ikicillof@gmail.com"><Mail size={16} /> Email</a></div></div><div className="info-stack"><div className="info-card"><strong><Sparkles size={14} style={{ display:'inline', marginRight:5 }} /> Hecho a pedido</strong><span>7 a 14 días hábiles desde la confirmación.</span></div><div className="info-card"><strong><MapPin size={14} style={{ display:'inline', marginRight:5 }} /> Retiro</strong><span>Vicente López, zona norte del GBA. Dirección a coordinar.</span></div><div className="info-card"><strong>Envíos</strong><span>Motomensajería o retiro. Consultanos por tu zona.</span></div><div className="info-card"><strong>Medios de pago</strong><span>Mercado Pago, transferencia o efectivo al retirar.</span></div></div></div></div></div></section>
  </>
}
