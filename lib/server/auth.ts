import 'server-only'
import type { UserRecord } from 'firebase-admin/auth'
import { adminAuth } from '@/lib/firebase/admin'
import { esRol, permisosValidos, type Permiso, type Rol } from '@/lib/roles'

const normalizar = (email?: string | null) => (email ?? '').trim().toLowerCase()

/** Verifica el ID token del encabezado Authorization: Bearer (y que no esté revocado). */
export async function usuarioDeLaSolicitud(req: Request) {
  const match = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')
  if (!match) return null
  try {
    return await adminAuth().verifyIdToken(match[1], true)
  } catch {
    return null
  }
}

/**
 * Rol real de una persona, calculado en el servidor.
 * - Creador: el email coincide con CREATOR_EMAIL Y está verificado (si no, cualquiera podría
 *   registrarse con ese email sin ser su dueño).
 * - Un claim "creador" sin coincidir con CREATOR_EMAIL ya no vale.
 */
export function resolverRol(user: UserRecord): { rol: Rol; permisos: Permiso[] } {
  const creador = normalizar(process.env.CREATOR_EMAIL)
  if (creador && user.emailVerified && normalizar(user.email) === creador) return { rol: 'creador', permisos: [] }
  const claims = user.customClaims ?? {}
  const rol: Rol = esRol(claims.rol) && claims.rol !== 'creador' ? claims.rol : 'cliente'
  return { rol, permisos: rol === 'colaborador' ? permisosValidos(claims.permisos) : [] }
}

export const json = (cuerpo: unknown, status = 200) =>
  Response.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } })
