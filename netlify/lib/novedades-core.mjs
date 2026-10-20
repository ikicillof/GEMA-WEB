// Envío de novedades por lotes con la API de batch de Resend. Corre dentro de una función de fondo de Netlify (hasta 15 minutos),
// por eso no importa nada de Next ni de lib/: es autosuficiente (firebase-admin + fetch + crypto).
//
// Modelo en Firestore (lo escribe la web en app/api/admin/novedades):
//   novedades/{id}                    asunto, html, texto (con la marca __BAJA_URL__), total, enviados, fallidos, omitidos,
//                                     estado (preparando | en_cola | enviando | completado | error), bloqueadoHasta (ms), ultimoError
//   novedades/{id}/destinatarios/{uid} email, estado (pendiente | enviado | error | baja), intentos
//   mailsDiarios/{aaaa-mm-dd}         enviados  (contador del día, en UTC, que comparten las novedades y los mails de venta)
//
// Reglas que cumple:
//  - Cupo diario de Resend: usa solo (límite - reserva para ventas - ya enviados hoy). Si no alcanza, la campaña queda «en_cola» y
//    sigue sola al día siguiente (función programada) o con «Continuar» en el panel.
//  - Antes de cada lote vuelve a leer el perfil: quien se dio de baja después de armada la campaña NO recibe el mail.
//  - Un candado (bloqueadoHasta) evita que dos ejecuciones manden lo mismo, y cada lote lleva Idempotency-Key.
import { createHash, createHmac } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const MARCA_BAJA = '__BAJA_URL__'
const LOTE_MAX = 100 // máximo de la API de batch de Resend
const BLOQUEO_MS = 120_000
const MAX_INTENTOS = 3
const dormir = ms => new Promise(r => setTimeout(r, ms))

function db() {
  if (!getApps().length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) throw new Error('Faltan variables de Firebase Admin')
    initializeApp({ credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) })
  }
  return getFirestore()
}

const sitio = () => (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '')
const dia = () => new Date().toISOString().slice(0, 10)

export function limites() {
  const limite = Math.floor(Number(process.env.RESEND_LIMITE_DIARIO))
  const reserva = Math.floor(Number(process.env.NOVEDADES_RESERVA_VENTAS))
  return { limite: limite > 0 ? limite : 100, reserva: reserva >= 0 ? reserva : 20 }
}

/** Mismo algoritmo que lib/server/novedades-token.ts: `uid.HMAC-SHA256(baja:uid)`. */
export function tokenBaja(uid) {
  const secreto = (process.env.NOVEDADES_TOKEN_SECRET ?? '').trim()
  if (secreto.length < 32) throw new Error('NOVEDADES_TOKEN_SECRET sin configurar (mínimo 32 caracteres)')
  return `${uid}.${createHmac('sha256', secreto).update(`baja:${uid}`).digest('base64url')}`
}

async function enviadosHoy(d) {
  return Number((await d.doc(`mailsDiarios/${dia()}`).get()).get('enviados')) || 0
}

async function resend(ruta, cuerpo, idempotencia) {
  try {
    const res = await fetch(`https://api.resend.com${ruta}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(process.env.RESEND_API_KEY ?? '').trim()}`, 'Content-Type': 'application/json', ...(idempotencia ? { 'Idempotency-Key': idempotencia } : {}) },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(25_000),
    })
    return { ok: res.ok, status: res.status, datos: await res.json().catch(() => ({})) }
  } catch (e) {
    return { ok: false, status: 0, datos: { message: e.message } }
  }
}
const esCupo = r => r.status === 429 && /quota/i.test(String(r.datos?.name ?? ''))

/** Toma la campaña más antigua que sigue activa y le pone el candado. null = no hay o ya la está procesando otra ejecución. */
async function tomarCampana(d) {
  const snap = await d.collection('novedades').where('estado', 'in', ['en_cola', 'enviando']).get()
  const primera = snap.docs.sort((a, b) => (a.get('creadoEn')?.toMillis?.() ?? 0) - (b.get('creadoEn')?.toMillis?.() ?? 0))[0]
  if (!primera) return null
  const ok = await d.runTransaction(async tx => {
    const s = await tx.get(primera.ref)
    if ((Number(s.get('bloqueadoHasta')) || 0) > Date.now()) return false
    tx.update(primera.ref, { estado: 'enviando', bloqueadoHasta: Date.now() + BLOQUEO_MS })
    return true
  })
  return ok ? primera.ref : null
}

async function cerrar(ref) {
  const s = await ref.get()
  const enviados = Number(s.get('enviados')) || 0, fallidos = Number(s.get('fallidos')) || 0
  await ref.update({ estado: fallidos > 0 && enviados === 0 ? 'error' : 'completado', bloqueadoHasta: 0, terminadoEn: FieldValue.serverTimestamp(), ultimoError: null })
}

async function pausarPorCupo(d, ref) {
  await d.doc(`mailsDiarios/${dia()}`).set({ enviados: limites().limite, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
  await ref.update({ estado: 'en_cola', bloqueadoHasta: 0, ultimoError: 'Resend llegó a su límite diario de envíos. Sigue mañana.' })
}

async function procesarLote(d, ref, camp, docs) {
  // 1) Bajas posteriores a armar la campaña: no se les manda.
  const perfiles = await d.getAll(...docs.map(x => d.collection('users').doc(x.id)))
  const activos = [], bajas = []
  docs.forEach((x, i) => (perfiles[i].exists && perfiles[i].get('recibeNovedades') === true ? activos : bajas).push(x))
  if (bajas.length) {
    const b = d.batch()
    bajas.forEach(x => b.update(x.ref, { estado: 'baja' }))
    b.update(ref, { omitidos: FieldValue.increment(bajas.length) })
    await b.commit()
  }
  if (!activos.length) return 'sigue'

  // 2) Un mail por persona (cada una con su link de baja firmado y los encabezados de baja con un clic).
  const base = sitio(), reply = (process.env.RESEND_REPLY_TO ?? '').trim()
  const mails = activos.map(x => {
    const t = tokenBaja(x.id)
    const pagina = `${base}/baja?t=${t}`
    return {
      from: (process.env.RESEND_FROM_EMAIL ?? '').trim(), to: [x.get('email')], subject: camp.asunto,
      html: camp.html.split(MARCA_BAJA).join(pagina), text: camp.texto.split(MARCA_BAJA).join(pagina),
      ...(reply ? { reply_to: reply } : {}),
      headers: { 'List-Unsubscribe': `<${base}/api/novedades/baja?t=${t}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }
  })
  const clave = `novedad-${ref.id}-${createHash('sha1').update(activos.map(x => x.id).join(',')).digest('hex').slice(0, 24)}`

  // 3) Lote. El límite por segundo de Resend (429 rate_limit) se espera y se reintenta; el diario corta el envío.
  let r
  for (let i = 0; i < 3; i++) {
    r = await resend('/emails/batch', mails, clave)
    if (r.status !== 429 || esCupo(r)) break
    await dormir(1500 * (i + 1))
  }
  if (r.ok) {
    const ids = Array.isArray(r.datos?.data) ? r.datos.data : []
    const b = d.batch()
    activos.forEach((x, i) => b.update(x.ref, { estado: 'enviado', resendId: ids[i]?.id ?? null, enviadoEn: FieldValue.serverTimestamp() }))
    b.update(ref, { enviados: FieldValue.increment(activos.length), ultimoError: null })
    b.set(d.doc(`mailsDiarios/${dia()}`), { enviados: FieldValue.increment(activos.length), actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
    await b.commit()
    return 'sigue'
  }
  if (esCupo(r)) { await pausarPorCupo(d, ref); return 'cupo' }
  if (r.status === 0 || r.status === 429 || r.status >= 500) {
    await ref.update({ estado: 'en_cola', bloqueadoHasta: 0, ultimoError: `Resend no respondió bien (${r.status || 'sin conexión'}). Se vuelve a intentar.` })
    return 'reintentar'
  }

  // 4) Resend rechazó el lote por un dato (ej. una dirección inválida): se prueba de a uno para que una mala no frene a las demás.
  for (const [i, x] of activos.entries()) {
    const uno = await resend('/emails', mails[i])
    if (uno.ok) {
      const b = d.batch()
      b.update(x.ref, { estado: 'enviado', resendId: uno.datos?.id ?? null, enviadoEn: FieldValue.serverTimestamp() })
      b.update(ref, { enviados: FieldValue.increment(1) })
      b.set(d.doc(`mailsDiarios/${dia()}`), { enviados: FieldValue.increment(1), actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
      await b.commit()
    } else if (esCupo(uno)) { await pausarPorCupo(d, ref); return 'cupo' }
    else if (uno.status === 0 || uno.status === 429 || uno.status >= 500) {
      await ref.update({ estado: 'en_cola', bloqueadoHasta: 0, ultimoError: `Resend no respondió bien (${uno.status || 'sin conexión'}). Se vuelve a intentar.` })
      return 'reintentar'
    } else {
      const intentos = (Number(x.get('intentos')) || 0) + 1
      const b = d.batch()
      if (intentos >= MAX_INTENTOS) {
        b.update(x.ref, { estado: 'error', intentos, error: String(uno.datos?.message ?? uno.status).slice(0, 200) })
        b.update(ref, { fallidos: FieldValue.increment(1) })
      } else b.update(x.ref, { intentos })
      await b.commit()
    }
    await dormir(600)
  }
  return 'sigue'
}

/**
 * Manda lo que se pueda dentro del cupo del día y del tiempo disponible. Idempotente: se puede llamar de nuevo sin riesgo de duplicar.
 * Devuelve { lotes, motivo } con motivo: terminado | cupo | sin-campana | reintentar | tiempo.
 */
export async function procesarCola({ maxMs = 13 * 60_000 } = {}) {
  const d = db()
  const fin = Date.now() + maxMs
  const resumen = { lotes: 0, motivo: 'tiempo' }
  let ref = null // la campaña que esta ejecución tiene tomada (con su candado): se retiene hasta cerrarla
  while (Date.now() < fin) {
    if (!ref) {
      ref = await tomarCampana(d)
      if (!ref) { if (resumen.motivo !== 'terminado') resumen.motivo = 'sin-campana'; break }
    }
    const { limite, reserva } = limites()
    const disponibles = Math.max(0, limite - reserva - (await enviadosHoy(d)))
    if (disponibles <= 0) {
      await ref.update({ estado: 'en_cola', bloqueadoHasta: 0, ultimoError: 'Se llegó al límite diario de envíos. Sigue mañana.' })
      resumen.motivo = 'cupo'
      break
    }
    const pendientes = await ref.collection('destinatarios').where('estado', '==', 'pendiente').limit(Math.min(LOTE_MAX, disponibles)).get()
    if (pendientes.empty) { await cerrar(ref); resumen.motivo = 'terminado'; ref = null; continue }
    const resultado = await procesarLote(d, ref, (await ref.get()).data(), pendientes.docs)
    resumen.lotes++
    if (resultado !== 'sigue') { resumen.motivo = resultado; break }
    await ref.update({ bloqueadoHasta: Date.now() + BLOQUEO_MS })
    await dormir(700)
  }
  return resumen
}
