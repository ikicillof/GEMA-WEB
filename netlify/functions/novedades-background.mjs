// Función de fondo (el sufijo «-background» hace que Netlify responda 202 enseguida y la deje correr hasta 15 minutos).
// La despierta la web (dispararEnvio) o la función programada, siempre con el secreto compartido. Sin secreto correcto no hace nada.
import { timingSafeEqual } from 'node:crypto'
import { procesarCola } from '../lib/novedades-core.mjs'

const igual = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }

export default async (req) => {
  const secreto = (process.env.NOVEDADES_SECRET ?? '').trim()
  if (!secreto || !igual(req.headers.get('x-novedades-secret') ?? '', secreto)) return new Response('No autorizado', { status: 401 })
  try {
    console.log('[novedades]', JSON.stringify(await procesarCola()))
  } catch (e) {
    console.error('[novedades] el envío falló:', e.message)
  }
  return new Response('ok')
}
