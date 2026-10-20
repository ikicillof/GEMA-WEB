import { cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { FirmaSchema } from '@/lib/server/admin-schemas'
import { json } from '@/lib/server/auth'
import { firmarSubida } from '@/lib/server/cloudinary'

export const dynamic = 'force-dynamic'

/** Firma para subir una imagen (o un modelo 3D) directo a Cloudinary. Solo admin o creador; nunca se devuelve el API Secret. */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'firma', minRol: 'admin', maxPorMinuto: 40 })
  if ('error' in r) return r.error
  const parsed = FirmaSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
  const firma = firmarSubida(parsed.data.tipo)
  if (!firma) {
    console.error('[admin/firma] Cloudinary sin configurar')
    return json({ error: 'La subida de fotos no está configurada todavía.' }, 503)
  }
  return json(firma)
}
