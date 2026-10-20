import Link from 'next/link'
import { Instagram, Mail, MessageCircle, Send } from 'lucide-react'
import { DATA_FISCAL, VENDEDORA } from '@/lib/vendedora'
import { Dato } from './legal'

export function SiteFooter() {
  return <footer className="site-footer"><div className="shell">
    <div className="footer-grid">
      <div className="footer-brand"><p>Hacemos que cada rincón brille.</p><span className="footer-dotline" /></div>
      <div><p className="footer-label">Explorá</p><div className="footer-links"><Link href="/">Inicio</Link><Link href="/tienda">Tienda</Link><Link href="/quienes-somos">Quiénes somos</Link><Link href="/contacto">Contacto</Link></div></div>
      <div><p className="footer-label">Hablemos</p><div className="footer-links"><a href="https://instagram.com/ivankicillof_" target="_blank" rel="noreferrer"><Instagram size={15} /> @ivankicillof_</a><a href="https://wa.me/5491128397462?text=Hola%20Gemma%2C%20quiero%20consultar%20por%20un%20producto." target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a><a href="mailto:ikicillof@gmail.com"><Mail size={15} /> ikicillof@gmail.com</a></div></div>
      <nav aria-label="Información legal"><p className="footer-label">Legales</p><div className="footer-links"><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Política de privacidad</Link><Link href="/devoluciones">Cambios y devoluciones</Link><Link href="/arrepentimiento">Botón de arrepentimiento</Link></div></nav>
    </div>
    <div className="footer-vendedora">
      <p>
        <b>{VENDEDORA.nombreComercial}</b> es una marca de <Dato v={VENDEDORA.razonSocial} /> · CUIT <Dato v={VENDEDORA.cuit} /><br />
        <Dato v={VENDEDORA.condicionFiscal} /> · <Dato v={VENDEDORA.domicilio} />
      </p>
      {DATA_FISCAL.qrImagen
        ? <a className="footer-qr" href={DATA_FISCAL.qrUrl ?? undefined} target="_blank" rel="noreferrer" aria-label="Data Fiscal (ARCA)"><img src={DATA_FISCAL.qrImagen} alt="QR de Data Fiscal" /></a>
        : <div className="footer-qr" role="img" aria-label="Espacio reservado para el QR de Data Fiscal">[QR DATA FISCAL]</div>}
    </div>
    <div className="footer-bottom">
      <span>© 2026 Gemma. Hecho para hogares con personalidad.</span>
      <Link href="/arrepentimiento" className="footer-arrepentimiento"><Send size={14} /> Botón de arrepentimiento</Link>
      <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noreferrer">Defensa del Consumidor</a>
    </div>
  </div></footer>
}
