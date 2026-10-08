import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Gemma — Hacemos que cada rincón brille',
  description:
    'Objetos de diseño de impresión 3D para el hogar. Lámparas, calendarios, estantes y más, con la personalidad de Gemma.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Saltar al contenido
        </a>
        <Header cartCount={0} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
