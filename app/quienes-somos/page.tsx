import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import { AboutPage } from '@/components/about-page'

export const metadata: Metadata = metaPagina({ titulo: 'Quiénes somos', descripcion: 'Conocé la historia de Gemma y a Gemi: objetos de diseño impresos en 3D, hechos a pedido, con ganas de hacer brillar cada rincón.', ruta: '/quienes-somos' })

// Quiénes somos: Gemi cuenta la historia, los 5 valores como objetos 3D y Gemma en números (contenido en lib/about-data.ts).
export default function Page() { return <AboutPage /> }
