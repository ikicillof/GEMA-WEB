import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { resolverRol } from '@/lib/server/auth'
import { PERMISOS_COLABORADOR, RANGO, permisosValidos, type Permiso, type Rol } from '@/lib/roles'

export type ResultadoRol =
  | { ok: true; uid: string; rol: Rol; permisos: Permiso[] }
  | { ok: false; status: 403 | 404 | 409; error: string }

/**
 * Cambia el rol de una persona (única puerta: la usan /api/admin/roles y /api/admin/equipo).
 * El rol de quien actúa se lee fresco desde Firebase. Reglas:
 *  - creador: puede dejar a cualquiera (menos a sí mismo y a otro creador) como admin, colaborador o cliente.
 *  - admin: solo mueve gente entre colaborador y cliente; no toca admins ni al creador.
 *  - colaborador / cliente: nada.
 *  - Nadie modifica al creador. "creador" no se puede asignar: lo da únicamente CREATOR_EMAIL.
 *  - Solo se suman cuentas con el email verificado (si no, cualquiera podría registrar el email de otra persona).
 */
export async function cambiarRol(actorUid: string, objetivoUid: string, rol: 'cliente' | 'colaborador' | 'admin', permisosPedidos?: string[]): Promise<ResultadoRol> {
  const auth = adminAuth()
  const actor = resolverRol(await auth.getUser(actorUid))
  if (RANGO[actor.rol] < RANGO.admin) return { ok: false, status: 403, error: 'No tenés permiso para esto' }
  if (objetivoUid === actorUid) return { ok: false, status: 403, error: 'No podés cambiar tu propio rol' }

  let objetivo
  try { objetivo = await auth.getUser(objetivoUid) } catch { return { ok: false, status: 404, error: 'Usuario no encontrado' } }
  const rolActual = resolverRol(objetivo).rol
  if (rolActual === 'creador') return { ok: false, status: 403, error: 'No tenés permiso para esto' }
  if (actor.rol === 'admin' && (RANGO[rolActual] > RANGO.colaborador || RANGO[rol] > RANGO.colaborador)) return { ok: false, status: 403, error: 'No tenés permiso para esto' }
  if (rol !== 'cliente' && objetivo.emailVerified !== true) return { ok: false, status: 409, error: 'Esa cuenta todavía no verificó su email.' }

  const permisos: Permiso[] = rol === 'colaborador' ? (permisosPedidos ? permisosValidos(permisosPedidos) : [...PERMISOS_COLABORADOR]) : []
  await auth.setCustomUserClaims(objetivo.uid, rol === 'colaborador' ? { rol, permisos } : { rol })
  // Corta las sesiones abiertas de esa persona para que el cambio (sobre todo una baja) rija ya.
  await auth.revokeRefreshTokens(objetivo.uid)

  const db = adminDb()
  await db.collection('users').doc(objetivo.uid).set({ rol }, { merge: true })
  await db.collection('auditoria').add({
    tipo: 'cambio-de-rol',
    porUid: actorUid,
    aUid: objetivo.uid,
    aEmail: objetivo.email ?? '',
    rolAnterior: rolActual,
    rolNuevo: rol,
    permisos,
    fecha: FieldValue.serverTimestamp(),
  })
  return { ok: true, uid: objetivo.uid, rol, permisos }
}
