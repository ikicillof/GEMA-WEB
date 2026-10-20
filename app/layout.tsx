import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/components/cart-context'
import { SiteHeader } from '@/components/site-header'
import { CartDrawer } from '@/components/cart-drawer'
import { SiteFooter } from '@/components/site-footer'
import { GemmaMotion } from '@/components/gemma-motion'
import { PageTransition } from '@/components/page-transition'
import { InitialLoader } from '@/components/initial-loader'
import { GemiGlobal } from '@/components/gemi-global'
import { SmoothScroll } from '@/components/smooth-scroll'
import { AuthProvider } from '@/components/auth-provider'
import { LoginModal } from '@/components/login-modal'
import { AvisoNovedades } from '@/components/aviso-novedades'
import { CursorTrail } from '@/components/cursor-trail'
import { MARCA, urlDelSitio } from '@/lib/seo'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' })

// Valores por defecto para todo el sitio; cada página los afina con metaPagina() (lib/seo.ts). metadataBase sale de SITE_URL.
// El canonical './' hace que cada página tenga como canonical su propia dirección.
export const metadata: Metadata = {
  metadataBase: new URL(urlDelSitio()),
  applicationName: MARCA.nombre,
  title: { default: `${MARCA.nombre} | ${MARCA.lema}`, template: '%s | Gemma' },
  description: MARCA.descripcion,
  alternates: { canonical: './' },
  openGraph: { type: 'website', locale: 'es_AR', siteName: MARCA.nombre, title: `${MARCA.nombre} | ${MARCA.lema}`, description: MARCA.descripcion, images: [{ url: '/og-gemma.png', width: 1200, height: 630, alt: `${MARCA.nombre}: ${MARCA.lema.toLowerCase()}` }] },
  twitter: { card: 'summary_large_image', title: `${MARCA.nombre} | ${MARCA.lema}`, description: MARCA.descripcion, images: ['/og-gemma.png'] },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es-AR"><body className={poppins.variable}><AuthProvider><CartProvider><SmoothScroll /><InitialLoader /><PageTransition /><SiteHeader /><main>{children}</main><SiteFooter /><CartDrawer /><GemiGlobal /><GemmaMotion /><CursorTrail /><LoginModal /><AvisoNovedades /></CartProvider></AuthProvider></body></html>
}
