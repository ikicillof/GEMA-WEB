import { adminAuth } from '@/lib/firebase/admin'
import { json, resolverRol, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { reintentarMailsFallidos } from '@/lib/server/emails'
import { ipDe, limitar } from '@/lib/server/rate-limit'
import { RANGO } from '@/lib/roles'

export const dynamic = 'force-dynamic'

/** Reintenta los mails de venta que fallaron (ventas con mailsPendientes). Solo admin o creador; lo va a usar el panel. */
export async function POST(req: Request) {
  if (!limitar(`mails-reintentar:${ipDe(req)}`, 6)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)
  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return json({ error: 'No autorizado' }, 401)
  try {
    const actor = resolverRol(await adminAuth().getUser(decoded.uid))
    if (RANGO[actor.rol] < RANGO.admin) return json({ error: 'No tenés permiso para esto' }, 403)
    return json(await reintentarMailsFallidos())
  } catch (e) {
    console.error('[mails] reintentar', (e as Error).message)
    return json({ error: 'No pudimos reintentar los mails' }, 500)
  }
}
