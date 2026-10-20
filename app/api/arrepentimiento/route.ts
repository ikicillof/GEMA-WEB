import { json } from '@/lib/server/auth'
import { nuevoTramite, registrarSolicitud, SolicitudSchema } from '@/lib/server/arrepentimiento'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Botón de arrepentimiento: público a propósito (no hace falta tener cuenta ni haber iniciado sesión).
 * Defensas: límite por IP, validación estricta (zod), campo trampa para bots, y no se revela si el pedido existe.
 */
export async function POST(req: Request) {
  if (!limitar(`arrepentimiento:${ipDe(req)}`, 5, 10 * 60_000)) {
    return json({ error: 'Mandaste varias solicitudes seguidas. Probá de nuevo en unos minutos o escribinos por email.' }, 429)
  }
  const parsed = SolicitudSchema.safeParse(await req.json().catch(() => undefined))
  if (!parsed.success) {
    return json({ error: 'Revisá los datos: el número de pedido, tu nombre y un email válido son obligatorios.', campos: parsed.error.issues.map(i => String(i.path[0])) }, 400)
  }
  // Trampa para bots: si el campo oculto viene completo, se responde como si hubiera salido bien, pero no se guarda ni se manda nada.
  if (parsed.data.web) return json({ tramite: nuevoTramite() }, 201)
  try {
    return json({ tramite: await registrarSolicitud(parsed.data) }, 201)
  } catch (e) {
    console.error('[arrepentimiento] registrar', (e as Error).message)
    return json({ error: 'No pudimos registrar tu solicitud. Probá de nuevo o escribinos por email.' }, 500)
  }
}
