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
import { CursorTrail } from '@/components/cursor-trail'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' })

export const metadata: Metadata = { title: 'Gemma — Hacemos que cada rincón brille', description: 'Objetos de diseño impresos en 3D para hacer que cada rincón se sienta más hogar.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className={poppins.variable}><CartProvider><SmoothScroll /><InitialLoader /><PageTransition /><SiteHeader /><main>{children}</main><SiteFooter /><CartDrawer /><GemiGlobal /><GemmaMotion /><CursorTrail /></CartProvider></body></html>
}
