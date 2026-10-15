// Tipos y constantes del checkout y los envíos. Sin secretos: lo usan el servidor y el navegador.

export const WHATSAPP_NUMERO = '5491128397462'

// Códigos de provincia de una letra (ISO 3166-2:AR), los que usa la API MiCorreo.
export const PROVINCIAS = [
  { codigo: 'C', nombre: 'Ciudad Autónoma de Buenos Aires' },
  { codigo: 'B', nombre: 'Buenos Aires' },
  { codigo: 'K', nombre: 'Catamarca' },
  { codigo: 'H', nombre: 'Chaco' },
  { codigo: 'U', nombre: 'Chubut' },
  { codigo: 'X', nombre: 'Córdoba' },
  { codigo: 'W', nombre: 'Corrientes' },
  { codigo: 'E', nombre: 'Entre Ríos' },
  { codigo: 'P', nombre: 'Formosa' },
  { codigo: 'Y', nombre: 'Jujuy' },
  { codigo: 'L', nombre: 'La Pampa' },
  { codigo: 'F', nombre: 'La Rioja' },
  { codigo: 'M', nombre: 'Mendoza' },
  { codigo: 'N', nombre: 'Misiones' },
  { codigo: 'Q', nombre: 'Neuquén' },
  { codigo: 'R', nombre: 'Río Negro' },
  { codigo: 'A', nombre: 'Salta' },
  { codigo: 'J', nombre: 'San Juan' },
  { codigo: 'D', nombre: 'San Luis' },
  { codigo: 'Z', nombre: 'Santa Cruz' },
  { codigo: 'S', nombre: 'Santa Fe' },
  { codigo: 'G', nombre: 'Santiago del Estero' },
  { codigo: 'V', nombre: 'Tierra del Fuego' },
  { codigo: 'T', nombre: 'Tucumán' },
] as const

export const CODIGOS_PROVINCIA = PROVINCIAS.map(p => p.codigo)
export const CP_REGEX = /^\d{4}$/

export type Modalidad = 'domicilio' | 'sucursal'

export type OpcionEnvio = {
  modalidad: Modalidad
  servicio: string
  precio: number
  plazoMin: number | null
  plazoMax: number | null
}

export type Sucursal = { codigo: string; nombre: string; direccion: string; localidad: string; cp: string }

export type DatosEnvio = {
  nombre: string
  dni: string
  telefono: string
  email: string
  calle: string
  numero: string
  piso: string
  localidad: string
  provincia: string
  cp: string
}

export const DATOS_ENVIO_VACIOS: DatosEnvio = { nombre: '', dni: '', telefono: '', email: '', calle: '', numero: '', piso: '', localidad: '', provincia: '', cp: '' }

/** Lo único que el navegador manda del carrito: qué producto, de qué color y cuántos. El precio sale siempre del servidor. */
export type ItemPedido = { slug: string; color: string; cantidad: number }

export type LineaResumen = { id: string; slug: string; name: string; price: number; image: string; color: string; quantity: number }

export type ResumenCheckout = {
  lineas: LineaResumen[]
  subtotal: number
  envio: { modalidad: Modalidad; servicio: string; precio: number; plazoMin: number | null; plazoMax: number | null; sucursal?: Sucursal } | null
  envioError: boolean // se pidió un envío pero no se pudo cotizar
  transferencia: { descuentoPct: number; descuento: number; total: number }
  mercadoPago: { total: number }
  simulado: boolean
}

export function plazoTexto(min: number | null, max: number | null) {
  if (min == null && max == null) return 'Plazo a confirmar'
  if (min != null && max != null && min !== max) return `${min} a ${max} días hábiles`
  return `${max ?? min} días hábiles`
}

export function mensajeWhatsApp(cp: string, items: { name: string; color: string; quantity: number }[]) {
  const lista = items.map(i => `${i.quantity} x ${i.name} (${i.color})`).join(', ')
  const texto = `Hola Gemma, no pude cotizar el envío en la web. Mi código postal es ${cp || '(sin completar)'} y quiero comprar: ${lista}. ¿Coordinamos el envío?`
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`
}
