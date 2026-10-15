import 'server-only'
import { json, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { ipDe, limitar } from '@/lib/server/rate-limit'

/**
 * Puerta de entrada de las rutas del checkout: límite por IP + sesión válida.
 * Las cuentas de email y contraseña sin verificar no pasan, aunque tengan un token vigente.
 */
export async function exigirUsuario(req: Request, ruta: string, maxPorMinuto = 40) {
  if (!limitar(`${ruta}:${ipDe(req)}`, maxPorMinuto)) return { error: json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429) }
  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return { error: json({ error: 'No autorizado' }, 401) }
  if (decoded.firebase?.sign_in_provider === 'password' && decoded.email_verified !== true) {
    return { error: json({ error: 'Verificá tu email para continuar' }, 403) }
  }
  return { uid: decoded.uid, email: decoded.email ?? '' }
}

export async function leerCuerpo(req: Request): Promise<unknown> {
  try { return await req.json() } catch { return undefined }
}
