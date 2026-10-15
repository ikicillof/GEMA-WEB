import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { json, resolverRol, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { ipDe, limitar } from '@/lib/server/rate-limit'
import { PERMISOS_COLABORADOR, RANGO, permisosValidos } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// "creador" no se puede asignar: lo da únicamente CREATOR_EMAIL.
const Cuerpo = z.object({
  uid: z.string().min(1).max(128),
  rol: z.enum(['cliente', 'colaborador', 'admin']),
  permisos: z.array(z.string().max(40)).max(20).optional(),
}).strict()

/**
 * Asigna o quita un rol. Las reglas se aplican acá, con el rol de quien llama leído fresco
 * desde Firebase (no del token, que puede estar desactualizado):
 *  - creador: puede dejar a cualquiera (menos a sí mismo y a otro creador) como admin, colaborador o cliente.
 *  - admin: solo mueve gente entre colaborador y cliente; no toca admins ni al creador.
 *  - colaborador / cliente: nada.
 */
export async function POST(req: Request) {
  if (!limitar(`roles:${ipDe(req)}`, 30)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)

  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return json({ error: 'No autorizado' }, 401)

  let datos: z.infer<typeof Cuerpo>
  try { datos = Cuerpo.parse(await req.json()) } catch { return json({ error: 'Datos inválidos' }, 400) }

  try {
    const auth = adminAuth()
    const actor = resolverRol(await auth.getUser(decoded.uid))
    if (RANGO[actor.rol] < RANGO.admin) return json({ error: 'No tenés permiso para esto' }, 403)
    if (datos.uid === decoded.uid) return json({ error: 'No podés cambiar tu propio rol' }, 403)

    let objetivo
    try { objetivo = await auth.getUser(datos.uid) } catch { return json({ error: 'Usuario no encontrado' }, 404) }
    const rolActual = resolverRol(objetivo).rol

    if (rolActual === 'creador') return json({ error: 'No tenés permiso para esto' }, 403)
    if (actor.rol === 'admin' && (RANGO[rolActual] > RANGO.colaborador || RANGO[datos.rol] > RANGO.colaborador)) {
      return json({ error: 'No tenés permiso para esto' }, 403)
    }

    const permisos = datos.rol === 'colaborador'
      ? (datos.permisos ? permisosValidos(datos.permisos) : [...PERMISOS_COLABORADOR])
      : []
    await auth.setCustomUserClaims(objetivo.uid, datos.rol === 'colaborador' ? { rol: datos.rol, permisos } : { rol: datos.rol })
    // Corta las sesiones abiertas de esa persona para que el cambio (sobre todo una baja) rija ya.
    await auth.revokeRefreshTokens(objetivo.uid)

    const db = adminDb()
    await db.collection('users').doc(objetivo.uid).set({ rol: datos.rol }, { merge: true })
    await db.collection('auditoria').add({
      tipo: 'cambio-de-rol',
      porUid: decoded.uid,
      aUid: objetivo.uid,
      rolAnterior: rolActual,
      rolNuevo: datos.rol,
      permisos,
      fecha: FieldValue.serverTimestamp(),
    })

    return json({ uid: objetivo.uid, rol: datos.rol, permisos })
  } catch (e) {
    console.error('[admin/roles] error', (e as Error).message)
    return json({ error: 'No pudimos cambiar el rol. Probá de nuevo.' }, 500)
  }
}
