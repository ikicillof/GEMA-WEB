import 'server-only'
import type { ItemPedido, LineaResumen } from '@/lib/envio'
import { getProductosServidor } from '@/lib/server/catalogo'
import type { Paquete } from '@/lib/server/micorreo'

// Límites de MiCorreo para un paquete.
const MAX_PESO_G = 25_000
const MAX_LADO_CM = 150

export type CarritoResuelto = {
  lineas: LineaResumen[]
  subtotal: number
  paquete: Paquete | null
  faltaLogistica: boolean // algún producto no tiene peso o medidas cargadas
  excede: boolean // no entra en un solo envío
  descartados: number // productos que ya no están a la venta o con un color inválido
}

/**
 * Convierte lo que manda el navegador (producto, color, cantidad) en líneas con los datos y PRECIOS reales
 * del catálogo. Nunca se usa un precio, nombre o foto que venga del cliente.
 */
export async function resolverItems(items: ItemPedido[]): Promise<CarritoResuelto> {
  const catalogo = new Map((await getProductosServidor()).map(p => [p.slug, p]))
  const lineas = new Map<string, LineaResumen>()
  let descartados = 0
  let faltaLogistica = false
  let peso = 0, alto = 0, ancho = 0, largo = 0

  for (const item of items) {
    const p = catalogo.get(item.slug)
    // Con colores a elegir, el color tiene que ser uno de la lista; si no, es siempre el único del producto.
    const color = p && (p.colors.length ? (p.colors.includes(item.color) ? item.color : null) : p.colorLabel || 'Único')
    if (!p || !color) { descartados++; continue }
    const id = `${p.slug}-${color}`
    const actual = lineas.get(id)
    const quantity = Math.min(99, (actual?.quantity ?? 0) + item.cantidad)
    lineas.set(id, { id, slug: p.slug, name: p.name, price: p.price, image: p.images[0] ?? '', color, quantity })
  }

  let subtotal = 0
  lineas.forEach(l => {
    subtotal += l.price * l.quantity
    const p = catalogo.get(l.slug)!
    if (!p.pesoGramos || !p.altoCm || !p.anchoCm || !p.largoCm) { faltaLogistica = true; return }
    peso += p.pesoGramos * l.quantity
    alto += p.altoCm * l.quantity // se apilan
    ancho = Math.max(ancho, p.anchoCm)
    largo = Math.max(largo, p.largoCm)
  })

  const paquete: Paquete | null = faltaLogistica || !lineas.size
    ? null
    : { pesoGramos: Math.ceil(peso), altoCm: Math.ceil(alto), anchoCm: Math.ceil(ancho), largoCm: Math.ceil(largo) }
  const excede = !!paquete && (paquete.pesoGramos > MAX_PESO_G || paquete.altoCm > MAX_LADO_CM || paquete.anchoCm > MAX_LADO_CM || paquete.largoCm > MAX_LADO_CM)

  return { lineas: Array.from(lineas.values()), subtotal, paquete, faltaLogistica, excede, descartados }
}
