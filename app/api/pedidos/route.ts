import { json } from '@/lib/server/auth'
import { aPublico, pedidos } from '@/lib/server/pedidos'
import { exigirUsuario } from '@/lib/server/sesion'

export const dynamic = 'force-dynamic'

/** Las compras de la persona con sesión (más nuevas primero). Solo lee ventas con su propio uid. */
export async function GET(req: Request) {
  const sesion = await exigirUsuario(req, 'pedidos-lista', 30)
  if ('error' in sesion) return sesion.error
  try {
    const snap = await pedidos().where('uid', '==', sesion.uid).limit(100).get()
    const lista = snap.docs.map(d => aPublico(d.id, d.data())).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    return json({ pedidos: lista })
  } catch (e) {
    console.error('[pedidos] lista', (e as Error).message)
    return json({ error: 'No pudimos cargar tus compras' }, 500)
  }
}
