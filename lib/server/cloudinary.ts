import 'server-only'
import { createHash } from 'node:crypto'

const CARPETAS = { imagen: 'gemma/productos', modelo: 'gemma/modelos' } as const
const FORMATOS_IMAGEN = 'jpg,jpeg,png,webp'

export type FirmaSubida = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  resourceType: 'image' | 'raw'
  allowedFormats?: string
}

/**
 * Firma de subida directa a Cloudinary, generada en el servidor. El navegador NUNCA ve el API Secret:
 * solo recibe la firma de estos parámetros fijos (carpeta, formatos permitidos y hora), que no puede alterar
 * sin invalidarla. La firma vence a los pocos minutos por el timestamp.
 */
export function firmarSubida(tipo: 'imagen' | 'modelo'): FirmaSubida | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const secreto = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloudName || !apiKey || !secreto) return null
  const timestamp = Math.floor(Date.now() / 1000)
  const params: Record<string, string | number> = { folder: CARPETAS[tipo], timestamp }
  if (tipo === 'imagen') params.allowed_formats = FORMATOS_IMAGEN
  const aFirmar = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  const signature = createHash('sha1').update(aFirmar + secreto).digest('hex')
  return {
    cloudName, apiKey, timestamp, signature,
    folder: CARPETAS[tipo],
    resourceType: tipo === 'imagen' ? 'image' : 'raw',
    ...(tipo === 'imagen' ? { allowedFormats: FORMATOS_IMAGEN } : {}),
  }
}
