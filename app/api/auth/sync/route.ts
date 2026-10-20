import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { json, resolverRol, usuarioDeLaSolicitud } from '@/lib/server/auth'
import { ipDe, limitar } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

// Solo se usan al CREAR el perfil. Nunca el email ni el rol: eso sale del token y del servidor.
const Cuerpo = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  recibeNovedades: z.boolean().optional(),
}).strict()

const limpiarNombre = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 80)

function leerJson(texto: string): unknown {
  try { return JSON.parse(texto) } catch { return undefined }
}

/**
 * Se llama después de cada ingreso: crea users/{uid} la primera vez y deja los custom claims
 * (rol) al día. El cliente después renueva su token para recibirlos.
 */
export async function POST(req: Request) {
  if (!limitar(`sync:${ipDe(req)}`, 30)) return json({ error: 'Demasiados intentos. Probá en un minuto.' }, 429)

  const decoded = await usuarioDeLaSolicitud(req)
  if (!decoded) return json({ error: 'No autorizado' }, 401)

  let cuerpo: z.infer<typeof Cuerpo> = {}
  const texto = await req.text()
  if (texto) {
    const parsed = Cuerpo.safeParse(leerJson(texto))
    if (!parsed.success) return json({ error: 'Datos inválidos' }, 400)
    cuerpo = parsed.data
  }

  try {
    const auth = adminAuth()
    const user = await auth.getUser(decoded.uid)
    const { rol, permisos } = resolverRol(user)

    // Custom claims: solo se escriben si cambiaron.
    const actual = user.customClaims ?? {}
    const igual = actual.rol === rol && JSON.stringify(actual.permisos ?? []) === JSON.stringify(permisos)
    if (!igual) await auth.setCustomUserClaims(user.uid, rol === 'colaborador' ? { rol, permisos } : { rol })

    // Perfil: se crea una sola vez; después el servidor solo mantiene email y rol al día.
    const ref = adminDb().collection('users').doc(user.uid)
    const nombre = limpiarNombre(cuerpo.nombre || user.displayName || (user.email ?? '').split('@')[0] || 'Cliente') || 'Cliente'
    const conGoogle = decoded.firebase?.sign_in_provider === 'google.com'
    // Al registrarse con email la casilla estaba a la vista; con Google, si no la tildó, se le pregunta una vez después.
    const recibeNovedades = cuerpo.recibeNovedades === true
    let preguntarNovedades = false
    try {
      await ref.create({
        nombre,
        email: user.email ?? '',
        rol,
        recibeNovedades,
        novedadesPreguntadas: !conGoogle || recibeNovedades,
        fechaAlta: FieldValue.serverTimestamp(),
      })
      preguntarNovedades = conGoogle && !recibeNovedades
    } catch (e) {
      if ((e as { code?: number }).code !== 6) throw e // 6 = ya existe
      // Una cuenta que ya existe NUNCA cambia lo que eligió: solo se mantienen email y rol al día.
      const previo = (await ref.get()).data() ?? {}
      await ref.update({ email: user.email ?? '', rol })
      preguntarNovedades = conGoogle && previo.novedadesPreguntadas !== true && previo.recibeNovedades !== true
    }

    return json({ rol, permisos, preguntarNovedades })
  } catch (e) {
    console.error('[auth/sync] error', (e as Error).message)
    return json({ error: 'No pudimos completar el ingreso. Probá de nuevo.' }, 500)
  }
}
