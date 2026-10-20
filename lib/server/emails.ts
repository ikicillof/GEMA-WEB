import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { DatosMail } from '@/emails/tipos'
import { armar, mandar, pesos, type TipoMail } from '@/lib/mail-core'
import { adminDb } from '@/lib/firebase/admin'
import { WHATSAPP_NUMERO } from '@/lib/envio'
import { getConfiguracion } from '@/lib/server/catalogo'
import { urlDelSitio } from '@/lib/server/mercadopago'

/**
 * Mails de cada venta (Resend). Se mandan desde el servidor DESPUÉS de guardar la venta: si Resend falla, la venta queda igual
 * y el error se anota en la propia venta (orders/{id}.emails.<tipo>) con `mailsPendientes: true`, para reintentarlo
 * con POST /api/admin/mails/reintentar (admin). Cada tipo se manda una sola vez por venta (se "reclama" en una transacción),
 * así un webhook repetido no duplica los mails.
 */
const ENVIANDO_VENCE_MS = 5 * 60 * 1000
const ordenes = () => adminDb().collection('orders')
const SITIO_POR_DEFECTO = 'https://gemma-oficial.com.ar'

const fechaAr = (d: Date) => d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Venta (documento de Firestore) -> datos de las plantillas. */
export async function datosDeVenta(id: string, d: FirebaseFirestore.DocumentData): Promise<DatosMail> {
  const sitio = urlDelSitio() ?? SITIO_POR_DEFECTO
  const e = d.datosEnvio ?? {}
  const env = d.envio ?? null
  let transferencia: DatosMail['transferencia'] = null
  let whatsapp = WHATSAPP_NUMERO
  try {
    const cfg = await getConfiguracion()
    transferencia = cfg.datosTransferencia
    if (cfg.whatsapp) whatsapp = cfg.whatsapp
  } catch { /* sin configuración: los mails salen sin datos de transferencia y con el WhatsApp por defecto */ }

  const lineas = (Array.isArray(d.lineas) ? d.lineas : []).map((l: { name?: string; color?: string; quantity?: number; price?: number }) => ({
    nombre: String(l.name ?? ''), color: String(l.color ?? ''), cantidad: Number(l.quantity) || 0, subtotal: (Number(l.price) || 0) * (Number(l.quantity) || 0),
  }))
  const nombre = String(e.nombre ?? '')
  const total = Number(d.total) || 0
  const esTransferencia = d.metodoPago === 'transferencia'
  const texto = esTransferencia
    ? `Hola Gemma, soy ${nombre}. Te envío el comprobante de la transferencia del pedido ${id}.\nProductos: ${lineas.map((l: { nombre: string; color: string; cantidad: number }) => `${l.nombre} (${l.color}) x${l.cantidad}`).join(', ')}\nTotal: ${pesos(total)}`
    : `Hola Gemma, tengo una consulta sobre mi pedido ${id}.`
  const creado = d.creadoEn instanceof Timestamp ? d.creadoEn.toDate() : new Date()

  return {
    pedidoId: id,
    fecha: fechaAr(creado),
    cliente: { nombre, email: String(e.email ?? d.email ?? ''), telefono: String(e.telefono ?? '') },
    lineas,
    subtotal: Number(d.subtotal) || 0,
    descuento: Number(d.descuento) || 0,
    envioTexto: env ? `${env.modalidad === 'domicilio' ? 'A domicilio' : 'Retiro en sucursal'} · ${env.servicio ?? 'Correo Argentino'}` : 'Sin envío',
    envioPrecio: Number(env?.precio) || 0,
    entregaTexto: env?.sucursal
      ? `${env.sucursal.nombre} (${env.sucursal.direccion})`
      : `${e.calle ?? ''} ${e.numero ?? ''}${e.piso ? `, ${e.piso}` : ''}, ${e.localidad ?? ''} (CP ${e.cp ?? ''})`,
    total,
    metodoPago: esTransferencia ? 'transferencia' : 'mercadopago',
    urlPanel: `${sitio}/admin/ventas/${id}`,
    transferencia: esTransferencia ? transferencia : null,
    urlWhatsApp: `https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`,
    urlMisCompras: `${sitio}/mis-compras`,
  }
}

/** Reclama el envío de un tipo de mail para una venta. false = ya se mandó (o lo está mandando otro proceso). */
async function reclamar(id: string, tipo: TipoMail): Promise<boolean> {
  const ref = ordenes().doc(id)
  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return false
    const previo = snap.get(`emails.${tipo}`) as { estado?: string; en?: Timestamp; intentos?: number } | undefined
    if (previo?.estado === 'enviado') return false
    if (previo?.estado === 'enviando' && previo.en && Date.now() - previo.en.toMillis() < ENVIANDO_VENCE_MS) return false
    tx.update(ref, { [`emails.${tipo}`]: { estado: 'enviando', en: Timestamp.now(), intentos: (previo?.intentos ?? 0) + 1 } })
    return true
  })
}

async function registrar(id: string, tipo: TipoMail, resultado: { ok: true; resendId?: string } | { ok: false; error: string }) {
  const ref = ordenes().doc(id)
  const snap = await ref.get()
  const intentos = (snap.get(`emails.${tipo}`) as { intentos?: number } | undefined)?.intentos ?? 1
  const base = { en: Timestamp.now(), intentos }
  const nuevo = resultado.ok
    ? { estado: 'enviado', ...base, ...(resultado.resendId ? { resendId: resultado.resendId } : {}) }
    : { estado: 'error', ...base, error: resultado.error.slice(0, 300) }
  const emails = { ...((snap.get('emails') ?? {}) as Record<string, { estado?: string }>), [tipo]: nuevo }
  await ref.update({
    [`emails.${tipo}`]: nuevo,
    mailsPendientes: Object.values(emails).some(m => m.estado === 'error'),
    actualizadoEn: FieldValue.serverTimestamp(),
  })
}

/** Manda uno o varios tipos de mail de una venta. Nunca lanza: un fallo queda anotado en la venta para reintentar. */
export async function enviarMails(id: string, tipos: TipoMail[]): Promise<void> {
  for (const tipo of tipos) {
    try {
      if (!(await reclamar(id, tipo))) continue
      try {
        const d = (await ordenes().doc(id).get()).data()!
        const avisos = tipo === 'nueva_venta_duena' ? (await getConfiguracion()).emailAvisos : null
        const armado = armar(tipo, await datosDeVenta(id, d), d.modoPrueba === true, avisos)
        const resendId = await mandar(armado)
        await registrar(id, tipo, { ok: true, resendId })
      } catch (e) {
        const mensaje = (e as Error).message || 'Error desconocido'
        console.error(`[emails] ${tipo} ${id}:`, mensaje)
        await registrar(id, tipo, { ok: false, error: mensaje })
      }
    } catch (e) {
      console.error(`[emails] ${tipo} ${id} (sin poder registrar):`, (e as Error).message)
    }
  }
}

export type { TipoMail }
export const avisarVentaNueva = (id: string) => enviarMails(id, ['nueva_venta_duena', 'confirmacion_cliente'])
export const avisarTransferenciaCompletada = (id: string) => enviarMails(id, ['transferencia_completada'])

/** Reintenta los mails que fallaron: los de una venta (si se pasa `id`) o los de todas las ventas con mailsPendientes. */
export async function reintentarMailsFallidos(id?: string): Promise<{ ventas: number; reintentados: number; siguenFallando: number }> {
  const docs = id
    ? [await ordenes().doc(id).get()].filter(d => d.exists && d.get('mailsPendientes') === true)
    : (await ordenes().where('mailsPendientes', '==', true).get()).docs
  let reintentados = 0
  let siguenFallando = 0
  for (const doc of docs) {
    const emails = (doc.get('emails') ?? {}) as Record<string, { estado?: string }>
    const tipos = Object.entries(emails).filter(([, m]) => m.estado === 'error').map(([t]) => t as TipoMail)
    await enviarMails(doc.id, tipos)
    reintentados += tipos.length
    const despues = ((await doc.ref.get()).get('emails') ?? {}) as Record<string, { estado?: string }>
    siguenFallando += tipos.filter(t => despues[t]?.estado === 'error').length
  }
  return { ventas: docs.length, reintentados, siguenFallando }
}
