import Link from 'next/link'
import { Instagram, Mail, MessageCircle, Send } from 'lucide-react'
import { DATA_FISCAL, VENDEDORA, instagramUsuario } from '@/lib/vendedora'

export function SiteFooter() {
  return <footer className="site-footer"><div className="shell">
    <div className="footer-grid">
      <div className="footer-brand"><p>Hacemos que cada rincón brille.</p><span className="footer-dotline" /></div>
      <div><p className="footer-label">Explorá</p><div className="footer-links"><Link href="/">Inicio</Link><Link href="/tienda">Tienda</Link><Link href="/quienes-somos">Quiénes somos</Link><Link href="/contacto">Contacto</Link></div></div>
      <div><p className="footer-label">Hablemos</p><div className="footer-links"><a href={VENDEDORA.instagram} target="_blank" rel="noreferrer"><Instagram size={15} /> @{instagramUsuario()}</a><a href={`https://wa.me/${VENDEDORA.whatsapp}?text=Hola%20Gemma%2C%20quiero%20consultar%20por%20un%20producto.`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a><a href={`mailto:${VENDEDORA.emailContacto}`}><Mail size={15} /> {VENDEDORA.emailContacto}</a></div></div>
      <nav aria-label="Información legal"><p className="footer-label">Legales</p><div className="footer-links"><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Política de privacidad</Link><Link href="/devoluciones">Cambios y devoluciones</Link><Link href="/arrepentimiento">Botón de arrepentimiento</Link></div></nav>
    </div>
    <div className="footer-vendedora">
      {DATA_FISCAL.qrImagen
        ? <a className="footer-qr footer-qr--real" href={DATA_FISCAL.qrUrl ?? undefined} target="_blank" rel="noopener noreferrer" aria-label="Data Fiscal (ARCA): verificar la inscripción, se abre en otra pestaña"><img src={DATA_FISCAL.qrImagen} alt="Data Fiscal: código QR de ARCA" width={239} height={327} loading="lazy" /></a>
        : <div className="footer-qr" role="img" aria-label="Espacio reservado para el QR de Data Fiscal">[QR DATA FISCAL]</div>}
    </div>
    <div className="footer-bottom">
      <span>© 2026 Gemma. Hecho para hogares con personalidad.</span>
      <Link href="/arrepentimiento" className="footer-arrepentimiento"><Send size={14} /> Botón de arrepentimiento</Link>
      <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noreferrer">Defensa del Consumidor</a>
    </div>
  </div></footer>
}
