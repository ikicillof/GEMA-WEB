import { getProductos, REVALIDAR_PAGINAS } from '@/lib/server/catalogo'

// Fotos de portada de los productos activos, en orden. Las usa el túnel de /tienda desde el navegador.
// Es información pública (la misma que ya muestra la tienda), por eso se puede cachear en el CDN.
export const revalidate = REVALIDAR_PAGINAS

export async function GET() {
  const portadas = (await getProductos()).map(p => p.images[0]).filter(Boolean)
  return Response.json({ portadas }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
}
