import { z } from 'zod'
import { standardColors } from '@/lib/products'

// Esquemas de validación de TODO lo que entra al panel. Estrictos: lo que no está en la lista se rechaza.

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? ''

/** Texto sin caracteres de control ni < >, recortado. */
const limpio = (max: number, min = 0) => z.string().transform(v => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g, ' ').trim()).pipe(z.string().min(min).max(max))

/** Una imagen o modelo del sitio (/productos/..., /modelos/...) o subido a NUESTRA cuenta de Cloudinary. Nada más. */
export function urlPermitida(v: string): boolean {
  if (/^\/(productos|modelos)\/[A-Za-z0-9._\-/]{1,160}$/.test(v) && !v.includes('..')) return true
  if (!CLOUD || v.length > 400) return false
  return v.startsWith(`https://res.cloudinary.com/${CLOUD}/`) && /^[A-Za-z0-9:/._\-%~@]+$/.test(v)
}
const url = z.string().refine(urlPermitida, 'Dirección no permitida')

const COLORES: [string, ...string[]] = ['Gris', ...standardColors.map(c => c.name).filter(n => n !== 'Gris')]
const medida = (max: number) => z.number().finite().gt(0).max(max).nullable()

export const ProductoSchema = z.object({
  name: limpio(80, 2),
  price: z.number().int().min(1).max(10_000_000),
  tag: limpio(40),
  categoria: limpio(40, 1),
  description: limpio(600),
  detail: limpio(2000),
  colors: z.array(z.enum(COLORES)).max(14).refine(a => new Set(a).size === a.length, 'Colores repetidos'),
  colorLabel: limpio(40),
  images: z.array(url).max(12),
  modelo3d: url.nullable(),
  featured: z.boolean(),
  activo: z.boolean(),
  orden: z.number().int().min(0).max(100_000),
  pesoGramos: medida(100_000),
  altoCm: medida(500),
  anchoCm: medida(500),
  largoCm: medida(500),
  /** Tilde "son las medidas reales": apaga el aviso de medidas provisorias. */
  confirmarMedidas: z.boolean().optional(),
}).strict()
export type ProductoEntrada = z.infer<typeof ProductoSchema>

export const ConfiguracionSchema = z.object({
  descuentoTransferenciaPct: z.number().min(0).max(50),
  datosTransferencia: z.object({ alias: limpio(60, 1), titular: limpio(80), banco: limpio(80) }).strict(),
  whatsapp: z.string().regex(/^\d{10,15}$/, 'Solo números con código de país, por ejemplo 5491112345678'),
  emailAvisos: z.string().trim().toLowerCase().max(120).email(),
}).strict()

export const CancelarSchema = z.object({ motivo: limpio(300, 3) }).strict()

export const EquipoSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  rol: z.enum(['colaborador', 'admin', 'cliente']),
  permisos: z.array(z.string().max(40)).max(10).optional(),
}).strict()

export const FirmaSchema = z.object({ tipo: z.enum(['imagen', 'modelo']) }).strict()

export const ReintentoSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9]{10,40}$/).optional() }).strict()

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const slugDe = (nombre: string) => nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
