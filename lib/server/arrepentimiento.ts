import 'server-only'
import { randomInt } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import type { DatosArrepentimientoCliente, DatosArrepentimientoDuena } from '@/emails/arrepentimiento-tipos'
import ArrepentimientoCliente from '@/emails/arrepentimiento-cliente'
import ArrepentimientoDuena from '@/emails/arrepentimiento-duena'
import { adminDb } from '@/lib/firebase/admin'
import { WHATSAPP_NUMERO } from '@/lib/envio'
import { mandar, type MailArmado } from '@/lib/mail-core'
import { getConfiguracion } from '@/lib/server/catalogo'
import { contarEnvios, sitio } from '@/lib/server/novedades-admin'
import { CONDICIONES, esMarcador, VENDEDORA } from '@/lib/vendedora'

// Botón de arrepentimiento (Resolución 424/2020). Las solicitudes viven en `arrepentimientos/{trámite}` (solo servidor).
// Cada solicitud manda DOS mails distintos, y cada uno tiene su propio estado en el documento:
//   mailCliente -> a la persona que se arrepintió (constancia, plantilla ArrepentimientoCliente, sin datos internos)
//   mailDuena   -> a emailAvisos (aviso con todos los datos, plantilla ArrepentimientoDuena)

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

export const CUALES_MAIL = ['cliente', 'duena'] as const
export type CualMail = (typeof CUALES_MAIL)[number]
/** Estado de un mail dentro de la solicitud (campos `mailCliente` y `mailDuena`). */
export type EstadoMail = { estado: 'pendiente' | 'enviado' | 'error'; intentos: number; en?: Timestamp; error?: string; resendId?: string }
export const campoMail = (cual: CualMail) => (cual === 'cliente' ? 'mailCliente' : 'mailDuena') as 'mailCliente' | 'mailDuena'

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

/** Plazo para el mail del cliente: si todavía es un marcador [ASÍ], el cliente lee una frase neutra (en una solicitud de prueba se ve el marcador, para no olvidarlo). */
const plazo = (valor: string, neutro: string, prueba: boolean) => (esMarcador(valor) && !prueba ? neutro : valor)

/** Email de contacto de la tienda: el de lib/vendedora.ts si ya está completo; si no, el de respuestas de Resend; si no, ninguno. */
export function emailDeContacto(): string | null {
  if (!esMarcador(VENDEDORA.emailContacto) && EMAIL.test(VENDEDORA.emailContacto)) return VENDEDORA.emailContacto
  const respuestas = process.env.RESEND_REPLY_TO?.trim()
  return respuestas && EMAIL.test(respuestas) ? respuestas : null
}

/**
 * Guarda la solicitud y manda los dos mails. NO revela a quien la manda si el pedido existe: solo devuelve el trámite.
 * Para la dueña se anota si el pedido se encontró y si el email coincide, así sabe qué verificar antes de gestionar.
 */
export async function registrarSolicitud(d: Solicitud): Promise<string> {
  const pedidoId = d.pedido.replace(/[^A-Za-z0-9]/g, '')
  let pedidoEncontrado = false
  let emailCoincide = false
  let modoPrueba = false
  if (/^[A-Za-z0-9]{10,40}$/.test(pedidoId)) {
    const venta = await adminDb().collection('orders').doc(pedidoId).get()
    pedidoEncontrado = venta.exists
    if (venta.exists) {
      emailCoincide = String(venta.get('datosEnvio.email') ?? venta.get('email') ?? '').trim().toLowerCase() === d.email
      modoPrueba = venta.get('modoPrueba') === true
    }
  }

  let tramite = ''
  const pendiente: EstadoMail = { estado: 'pendiente', intentos: 0 }
  for (let intento = 0; intento < 4; intento++) {
    tramite = nuevoTramite()
    try {
      await solicitudes().doc(tramite).create({
        tramite, pedido: d.pedido, pedidoId, nombre: d.nombre, email: d.email, motivo: d.motivo ?? '', estado: 'recibido',
        pedidoEncontrado, emailCoincide, modoPrueba, mailCliente: pendiente, mailDuena: pendiente, mailsPendientes: false, creadoEn: FieldValue.serverTimestamp(),
      })
      break
    } catch (e) {
      if ((e as { code?: number }).code !== 6 || intento === 3) throw e // 6 = ese trámite ya existe: se prueba con otro
    }
  }

  const inicioDelDia = Timestamp.fromDate(new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`))
  const hoy = (await solicitudes().where('creadoEn', '>=', inicioDelDia).count().get()).data().count
  if (hoy > TOPE_MAILS_POR_DIA) {
    const diferido: EstadoMail = { estado: 'error', intentos: 0, error: 'Se superó el tope diario de mails automáticos', en: Timestamp.now() }
    await solicitudes().doc(tramite).update({ mailCliente: diferido, mailDuena: diferido, mailsPendientes: true })
  } else {
    for (const cual of CUALES_MAIL) await enviarMailArrepentimiento(tramite, cual)
  }
  return tramite
}

/** Arma el mail que corresponde a cada destinatario: SIEMPRE su propia plantilla, su propio destinatario y su propio reply-to. */
async function armarMail(id: string, cual: CualMail, x: FirebaseFirestore.DocumentData): Promise<MailArmado> {
  const creado = x.creadoEn instanceof Timestamp ? x.creadoEn.toDate() : new Date()
  const prueba = x.modoPrueba === true
  const pref = prueba ? '[PRUEBA] ' : ''
  const base = { tramite: id, pedido: String(x.pedido ?? ''), nombre: String(x.nombre ?? ''), fecha: fechaLarga(creado), prueba }
  const url = sitio()

  if (cual === 'duena') {
    const para = (await getConfiguracion()).emailAvisos
    if (!para) throw new Error('Falta configuracion/general.emailAvisos')
    const d: DatosArrepentimientoDuena = { ...base, email: String(x.email ?? ''), motivo: String(x.motivo ?? ''), pedidoEncontrado: x.pedidoEncontrado === true, emailCoincide: x.emailCoincide === true, urlPanel: `${url}/admin/arrepentimientos` }
    return { para, asunto: `${pref}Nueva solicitud de arrepentimiento ${id}: pedido ${d.pedido}`, reply: EMAIL.test(d.email) ? d.email : undefined, react: ArrepentimientoDuena({ d }) }
  }

  const para = String(x.email ?? '')
  if (!EMAIL.test(para)) throw new Error('La solicitud no tiene un email de cliente válido')
  let whatsapp = WHATSAPP_NUMERO
  try { whatsapp = (await getConfiguracion()).whatsapp || WHATSAPP_NUMERO } catch { /* sin configuración: WhatsApp por defecto */ }
  const contacto = emailDeContacto()
  const d: DatosArrepentimientoCliente = {
    ...base,
    plazoRespuesta: plazo(CONDICIONES.plazoRespuestaArrepentimiento, 'a la brevedad', prueba),
    plazoReintegro: plazo(CONDICIONES.plazoReintegro, 'sin demoras', prueba),
    urlDevoluciones: `${url}/devoluciones`,
    emailContacto: contacto,
    urlWhatsApp: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola Gemma, escribo por mi solicitud de arrepentimiento ${id}.`)}`,
    whatsappVisible: `+${whatsapp}`,
  }
  return { para, asunto: `${pref}Recibimos tu solicitud de arrepentimiento (${id})`, reply: contacto ?? undefined, react: ArrepentimientoCliente({ d }) }
}

/**
 * Manda UNO de los dos mails y anota el resultado en su propio campo (`mailCliente` o `mailDuena`: estado, intentos, error).
 * Nunca lanza: un fallo queda anotado en la solicitud (mailsPendientes) para reintentar desde el panel. Si ese mail ya salió, no lo repite.
 */
export async function enviarMailArrepentimiento(id: string, cual: CualMail): Promise<EstadoMail | null> {
  const ref = solicitudes().doc(id)
  const campo = campoMail(cual)
  const otro = campoMail(cual === 'cliente' ? 'duena' : 'cliente')
  const snap = await ref.get()
  if (!snap.exists) return null
  const x = snap.data()!
  const previo = (x[campo] ?? { estado: 'pendiente', intentos: 0 }) as EstadoMail
  if (previo.estado === 'enviado') return previo
  const intentos = (previo.intentos ?? 0) + 1
  let nuevo: EstadoMail
  try {
    const resendId = await mandar(await armarMail(id, cual, x))
    await contarEnvios(1).catch(() => undefined)
    nuevo = { estado: 'enviado', intentos, en: Timestamp.now(), ...(resendId ? { resendId } : {}) }
  } catch (e) {
    const mensaje = (e as Error).message || 'Error desconocido'
    console.error(`[arrepentimiento] mail ${cual} ${id}:`, mensaje)
    nuevo = { estado: 'error', intentos, en: Timestamp.now(), error: mensaje.slice(0, 300) }
  }
  const estadoOtro = ((x[otro] as EstadoMail | undefined)?.estado) ?? 'pendiente'
  await ref.update({ [campo]: nuevo, mailsPendientes: nuevo.estado === 'error' || estadoOtro === 'error' })
    .catch(e => console.error('[arrepentimiento] no se pudo anotar el resultado del mail:', (e as Error).message))
  return nuevo
}
