// Función programada: todos los días a las 12:00 UTC (9:00 en Argentina, después de que Resend renueva el cupo diario) despierta el
// envío para que siga con los mails que quedaron en cola. Las programadas de Netlify tienen 30 segundos, por eso solo "toca el timbre"
// de la función de fondo. IMPORTANTE: Netlify ejecuta las programadas únicamente en el deploy de producción publicado.
export default async () => {
  const sitio = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '')
  const secreto = (process.env.NOVEDADES_SECRET ?? '').trim()
  if (!sitio || !secreto) { console.error('[novedades-diario] faltan SITE_URL o NOVEDADES_SECRET'); return }
  try {
    const r = await fetch(`${sitio}/.netlify/functions/novedades-background`, { method: 'POST', headers: { 'x-novedades-secret': secreto }, signal: AbortSignal.timeout(20_000) })
    console.log('[novedades-diario] envío despertado:', r.status)
  } catch (e) {
    console.error('[novedades-diario] no se pudo despertar el envío:', e.message)
  }
}

export const config = { schedule: '0 12 * * *' }
