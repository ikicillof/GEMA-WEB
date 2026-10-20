import { exigirStaff } from '@/lib/server/admin'
import { json } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

/** Quién es la persona que entró al panel y qué puede hacer (calculado en el servidor). Quien no es del equipo recibe 404. */
export async function GET(req: Request) {
  const r = await exigirStaff(req, { ruta: 'yo', maxPorMinuto: 120 })
  if ('error' in r) return r.error
  const { rol, permisos, email } = r.staff
  return json({ rol, permisos, email })
}
