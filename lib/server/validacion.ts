import 'server-only'
import { z } from 'zod'
import { CODIGOS_PROVINCIA } from '@/lib/envio'

// Quita caracteres de control y < > de los textos libres (se guardan y más tarde se muestran en el panel).
const texto = (min: number, max: number) =>
  z.string().transform(s => s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim()).pipe(z.string().min(min).max(max))

const provincia = z.string().refine(c => (CODIGOS_PROVINCIA as readonly string[]).includes(c))
const cp = z.string().regex(/^\d{4}$/)

export const DatosEnvioSchema = z.object({
  nombre: texto(2, 80),
  dni: z.string().regex(/^\d{7,8}$/),
  telefono: z.string().regex(/^[0-9+()\-\s]{8,20}$/),
  email: z.string().trim().email().max(254),
  calle: texto(1, 80),
  numero: z.string().regex(/^[0-9A-Za-z\s/\-]{1,10}$/),
  piso: texto(0, 20),
  localidad: texto(2, 80),
  provincia,
  cp,
}).strict()

export const ItemPedidoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  color: z.string().max(40),
  cantidad: z.number().int().min(1).max(99),
}).strict()

export const ItemsSchema = z.array(ItemPedidoSchema).max(50)

export const CotizarSchema = z.object({ cp, items: ItemsSchema.min(1) }).strict()

export const ResumenSchema = z.object({
  items: ItemsSchema.min(1),
  envio: z.object({
    modalidad: z.enum(['domicilio', 'sucursal']),
    cp,
    provincia,
    sucursal: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/).optional(),
  }).strict().optional(),
}).strict()

// Crear la venta: productos + envío elegido + datos de entrega + forma de pago. Ningún monto viene del navegador.
export const PedidoSchema = z.object({
  items: ItemsSchema.min(1),
  envio: z.object({
    modalidad: z.enum(['domicilio', 'sucursal']),
    cp,
    provincia,
    sucursal: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/).optional(),
  }).strict(),
  datosEnvio: DatosEnvioSchema,
  metodoPago: z.enum(['mercadopago', 'transferencia']),
}).strict()

export const CarritoSchema = z.object({ items: ItemsSchema, modo: z.enum(['reemplazar', 'fusionar']) }).strict()
