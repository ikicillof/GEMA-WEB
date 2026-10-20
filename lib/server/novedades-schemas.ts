import { z } from 'zod'
import { MAX_MENSAJE } from '@/lib/novedades-formato'
import { urlPermitida } from '@/lib/server/admin-schemas'

// Todo lo que entra al panel de novedades. Estricto: lo que no está en la lista se rechaza.

export const NovedadSchema = z.object({
  // Una sola línea: sin saltos ni caracteres de control (evita inyectar encabezados en el mail).
  asunto: z.string().transform(v => v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).pipe(z.string().min(3).max(120)),
  // Texto con las marcas de lib/novedades-formato. No se acepta HTML: React lo escapa al armar el mail.
  mensaje: z.string().transform(v => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim()).pipe(z.string().min(1).max(MAX_MENSAJE)),
  // Solo una imagen subida a NUESTRA cuenta de Cloudinary (en un mail no sirven las rutas del sitio).
  imagen: z.string().refine(v => v.startsWith('https://') && urlPermitida(v), 'Dirección no permitida').nullable(),
}).strict()
export type NovedadEntrada = z.infer<typeof NovedadSchema>

export const ID_CAMPANA = /^[A-Za-z0-9]{10,40}$/
