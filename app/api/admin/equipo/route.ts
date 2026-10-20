import { adminAuth } from '@/lib/firebase/admin'
import { cuerpoJson, exigirStaff } from '@/lib/server/admin'
import { EquipoSchema } from '@/lib/server/admin-schemas'
import { json, resolverRol } from '@/lib/server/auth'
import { cambiarRol } from '@/lib/server/roles-admin'
import { RANGO } from '@/lib/roles'

export const dynamic = 'force-dynamic'

/** Personas con acceso al panel (creador, admins y colaboradores). Solo admin o creador. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'equipo', minRol: 'admin' })
  if ('error' in r) return r.error
  try {
    const equipo: { uid: string; email: string; nombre: string; rol: string; permisos: string[] }[] = []
    let token: string | undefined
    do {
      const pagina = await adminAuth().listUsers(1000, token)
      for (const u of pagina.users) {
        const { rol, permisos } = resolverRol(u)
        if (RANGO[rol] >= RANGO.colaborador) equipo.push({ uid: u.uid, email: u.email ?? '', nombre: u.displayName ?? '', rol, permisos })
      }
      token = pagina.pageToken
    } while (token)
    equipo.sort((a, b) => RANGO[b.rol as keyof typeof RANGO] - RANGO[a.rol as keyof typeof RANGO] || a.email.localeCompare(b.email))
    return json({ equipo, yo: r.staff.uid })
  } catch (e) {
    console.error('[admin/equipo] listar', (e as Error).message)
    return json({ error: 'No pudimos cargar el equipo' }, 500)
  }
}

/**
 * Suma o quita a alguien del equipo por el email de una cuenta ya registrada y con el email verificado.
 * `rol: 'cliente'` es quitar. Las reglas (admin solo mueve colaboradores, el creador además admins, nadie toca al creador)
 * viven en cambiarRol y quedan en la auditoría.
 */
export async function POST(req: Request) {
  const r = await exigirStaff(req, { ruta: 'equipo-cambiar', minRol: 'admin', maxPorMinuto: 20 })
  if ('error' in r) return r.error
  const parsed = EquipoSchema.safeParse(await cuerpoJson(req))
  if (!parsed.success) return json({ error: 'Revisá el email y el rol' }, 400)
  try {
    let uid: string
    try { uid = (await adminAuth().getUserByEmail(parsed.data.email)).uid } catch { return json({ error: 'No hay ninguna cuenta registrada con ese email. La persona tiene que crear su cuenta primero.' }, 404) }
    const res = await cambiarRol(r.staff.uid, uid, parsed.data.rol, parsed.data.permisos)
    if (!res.ok) return json({ error: res.error }, res.status)
    return json({ uid: res.uid, rol: res.rol, permisos: res.permisos })
  } catch (e) {
    console.error('[admin/equipo] cambiar', (e as Error).message)
    return json({ error: 'No pudimos cambiar el rol. Probá de nuevo.' }, 500)
  }
}
