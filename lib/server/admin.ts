import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { json, resolverRol, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { ipDe, limitar } from '@/lib/server/rate-limit'
import { RANGO, type Permiso, type Rol } from '@/lib/roles'

export type Staff = { uid: string; email: string; rol: Rol; permisos: Permiso[] }

type Requisito = {
  /** Nombre de la ruta, para el límite por IP. */
  ruta: string
  maxPorMinuto?: number
  /** Rol mínimo. Por defecto: colaborador (cualquier integrante del equipo). */
  minRol?: Rol
  /** Un colaborador solo entra si tiene este permiso (admin y creador entran siempre). */
  permiso?: Permiso
}

/**
 * Puerta de TODA ruta del panel. Se verifica en el servidor en cada llamada:
 *  1. límite por IP;
 *  2. ID token válido y no revocado (y email verificado si entró con contraseña);
 *  3. el rol se lee FRESCO desde Firebase (no del token, que puede estar desactualizado) con resolverRol;
 *  4. rol mínimo y, para colaboradores, el permiso puntual.
 * Quien no es del equipo recibe 404 (no se revela que el panel existe); un colaborador sin permiso recibe 403.
 */
export async function exigirStaff(req: Request, r: Requisito): Promise<{ staff: Staff } | { error: Response }> {
  if (!limitar(`admin:${r.ruta}:${ipDe(req)}`, r.maxPorMinuto ?? 60)) return { error: json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429) }
  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return { error: json({ error: 'No autorizado' }, 401) }
  if (decoded.firebase?.sign_in_provider === 'password' && decoded.email_verified !== true) return { error: json({ error: 'No encontrado' }, 404) }
  try {
    const usuario = await adminAuth().getUser(decoded.uid)
    const { rol, permisos } = resolverRol(usuario)
    if (RANGO[rol] < RANGO.colaborador) return { error: json({ error: 'No encontrado' }, 404) }
    if (RANGO[rol] < RANGO[r.minRol ?? 'colaborador']) return { error: json({ error: 'No tenés permiso para esto' }, 403) }
    if (r.permiso && rol === 'colaborador' && !permisos.includes(r.permiso)) return { error: json({ error: 'No tenés permiso para esto' }, 403) }
    return { staff: { uid: usuario.uid, email: usuario.email ?? '', rol, permisos } }
  } catch (e) {
    console.error('[admin] verificación de rol:', (e as Error).message)
    return { error: json({ error: 'No pudimos verificar tu acceso' }, 500) }
  }
}

/** Registro de cambios del panel (colección `auditoria`, solo servidor). Nunca rompe la acción si falla. */
export async function auditar(staff: Staff, tipo: string, detalle: Record<string, unknown> = {}): Promise<void> {
  try {
    await adminDb().collection('auditoria').add({ tipo, porUid: staff.uid, porEmail: staff.email, ...detalle, fecha: FieldValue.serverTimestamp() })
  } catch (e) {
    console.error('[admin] auditoría', tipo, (e as Error).message)
  }
}

/** Cuerpo JSON de la solicitud (undefined si no es JSON válido). */
export async function cuerpoJson(req: Request): Promise<unknown> {
  try { return await req.json() } catch { return undefined }
}
