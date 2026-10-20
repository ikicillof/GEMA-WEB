import 'server-only'
import { randomInt } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import ArrepentimientoCliente from '@/emails/arrepentimiento-cliente'
import ArrepentimientoDuena, { type DatosArrepentimiento } from '@/emails/arrepentimiento-duena'
import { adminDb } from '@/lib/firebase/admin'
import { mandar, type MailArmado } from '@/lib/mail-core'
import { getConfiguracion } from '@/lib/server/catalogo'
import { contarEnvios, sitio } from '@/lib/server/novedades-admin'

// Botón de arrepentimiento (Resolución 424/2020). Las solicitudes viven en `arrepentimientos/{trámite}` (solo servidor).

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
/** Una línea, sin caracteres de control ni < > (nada de HTML ni saltos que inyecten encabezados). */
const linea = (max: number, min = 0) => z.string().transform(v => v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()).pipe(z.string().min(min).max(max))

export const SolicitudSchema = z.object({
  pedido: linea(60, 3),
  nombre: linea(80, 2),
  email: z.string().trim().toLowerCase().max(254).regex(EMAIL),
  motivo: z.string().transform(v => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim()).pipe(z.string().max(1000)).optional(),
  /** Campo trampa: las personas no lo ven ni lo completan; los bots sí. */
  web: z.string().max(200).optional(),
}).strict()
export type Solicitud = z.infer<typeof SolicitudSchema>

export const ESTADOS_ARREPENTIMIENTO = ['recibido', 'en_gestion', 'resuelto'] as const
export type EstadoArrepentimiento = (typeof ESTADOS_ARREPENTIMIENTO)[number]

// Sin letras ni números que se confunden (I, O, 0, 1).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const TRAMITE_VALIDO = /^ARR-\d{8}-[A-HJ-NP-Z2-9]{6}$/

/** N.º de trámite legible y difícil de adivinar: ARR-20261020-K7M2QX. */
export function nuevoTramite(): string {
  const dia = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  let azar = ''
  for (let i = 0; i < 6; i++) azar += ALFABETO[randomInt(ALFABETO.length)]
  return `ARR-${dia}-${azar}`
}

const solicitudes = () => adminDb().collection('arrepentimientos')
// Si en un día entran más solicitudes que esto, se siguen guardando todas (es una obligación recibirlas), pero no se mandan los mails
// automáticos: evita que alguien que mande spam al formulario agote el cupo diario de Resend. Quedan para reintentar desde el panel.
const TOPE_MAILS_POR_DIA = 30

const fechaLarga = (f: Date) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(f)

/**
 * Guarda la solicitud y manda los dos mails. NO revela a quien la manda si el pedido existe: solo devuelve el trámite.
 * Para la dueña se anota si el pedido se encontró y si el email coincide, así sabe qué verificar antes de gestionar.
 */
export async function registrarSolicitud(d: Solicitud): Promise<string> {
  const pedidoId = d.pedido.replace(/[^A-Za-z0-9]/g, '')
  let pedidoEncontrado = false
  let emailCoincide = false
  if (/^[A-Za-z0-9]{10,40}$/.test(pedidoId)) {
    const venta = await adminDb().collection('orders').doc(pedidoId).get()
    pedidoEncontrado = venta.exists
    if (venta.exists) emailCoincide = String(venta.get('datosEnvio.email') ?? venta.get('email') ?? '').trim().toLowerCase() === d.email
  }

  let tramite = ''
  for (let intento = 0; intento < 4; intento++) {
    tramite = nuevoTramite()
    try {
      await solicitudes().doc(tramite).create({
        tramite, pedido: d.pedido, pedidoId, nombre: d.nombre, email: d.email, motivo: d.motivo ?? '', estado: 'recibido',
        pedidoEncontrado, emailCoincide, emails: {}, mailsPendientes: false, creadoEn: FieldValue.serverTimestamp(),
      })
      break
    } catch (e) {
      if ((e as { code?: number }).code !== 6 || intento === 3) throw e // 6 = ese trámite ya existe: se prueba con otro
    }
  }

  const inicioDelDia = Timestamp.fromDate(new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`))
  const hoy = (await solicitudes().where('creadoEn', '>=', inicioDelDia).count().get()).data().count
  if (hoy > TOPE_MAILS_POR_DIA) {
    const diferido = { estado: 'error', error: 'Se superó el tope diario de mails automáticos', en: Timestamp.now() }
    await solicitudes().doc(tramite).update({ emails: { duena: diferido, cliente: diferido }, mailsPendientes: true })
  } else {
    await enviarMailsArrepentimiento(tramite, ['duena', 'cliente'])
  }
  return tramite
}

/** Manda uno o los dos mails. Nunca lanza: un fallo queda anotado en la solicitud (mailsPendientes) para reintentar desde el panel. */
export async function enviarMailsArrepentimiento(id: string, cuales: ('duena' | 'cliente')[]): Promise<void> {
  const ref = solicitudes().doc(id)
  const snap = await ref.get()
  if (!snap.exists) return
  const x = snap.data()!
  const creado = x.creadoEn instanceof Timestamp ? x.creadoEn.toDate() : new Date()
  const url = sitio()
  const datos: DatosArrepentimiento = {
    tramite: id, pedido: String(x.pedido ?? ''), nombre: String(x.nombre ?? ''), email: String(x.email ?? ''), motivo: String(x.motivo ?? ''),
    fecha: fechaLarga(creado), pedidoEncontrado: x.pedidoEncontrado === true, emailCoincide: x.emailCoincide === true,
    urlPanel: `${url}/admin/arrepentimientos`, urlDevoluciones: `${url}/devoluciones`,
  }
  const emails = { ...((x.emails ?? {}) as Record<string, { estado?: string }>) }
  for (const cual of cuales) {
    try {
      let armado: MailArmado
      if (cual === 'duena') {
        const para = (await getConfiguracion()).emailAvisos
        if (!para) throw new Error('Falta configuracion/general.emailAvisos')
        armado = { para, asunto: `Arrepentimiento ${id}: pedido ${datos.pedido}`, reply: datos.email, react: ArrepentimientoDuena({ d: datos }) }
      } else {
        const respuestas = process.env.RESEND_REPLY_TO?.trim()
        armado = { para: datos.email, asunto: `Recibimos tu solicitud de arrepentimiento (${id})`, ...(respuestas ? { reply: respuestas } : {}), react: ArrepentimientoCliente({ d: datos }) }
      }
      await mandar(armado)
      await contarEnvios(1).catch(() => undefined)
      emails[cual] = { estado: 'enviado', en: Timestamp.now() } as { estado: string }
    } catch (e) {
      const mensaje = (e as Error).message || 'Error desconocido'
      console.error(`[arrepentimiento] mail ${cual} ${id}:`, mensaje)
      emails[cual] = { estado: 'error', error: mensaje.slice(0, 300), en: Timestamp.now() } as { estado: string }
    }
  }
  await ref.update({ emails, mailsPendientes: Object.values(emails).some(m => m.estado === 'error') }).catch(e => console.error('[arrepentimiento] no se pudo anotar el resultado de los mails:', (e as Error).message))
}
