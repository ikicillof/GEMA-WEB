import { GemmaExperienceLoader } from '@/components/gemma-experience-loader'
import { HomeJourney } from '@/components/home-journey'
import { JsonLd } from '@/components/json-ld'
import { jsonLdOrganizacion, MARCA, metaPagina } from '@/lib/seo'

export const metadata = metaPagina({ titulo: `${MARCA.nombre} | Objetos de diseño impresos en 3D, hechos a pedido`, descripcion: MARCA.descripcion, ruta: '/', absoluto: true })

export default function HomePage() {
  return <>
    <JsonLd datos={jsonLdOrganizacion()} />
    <GemmaExperienceLoader />
    <HomeJourney />
  </>
}
