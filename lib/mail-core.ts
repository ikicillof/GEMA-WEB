// Armado y envío de un mail por Resend, sin acceso a Firestore (por eso lo puede usar también scripts/mails-ejemplo.mts).
import { render } from '@react-email/render'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import ConfirmacionCliente from '@/emails/confirmacion-cliente'
import NuevaVentaDuena from '@/emails/nueva-venta-duena'
import TransferenciaCompletada from '@/emails/transferencia-completada'
import VentaCancelada from '@/emails/venta-cancelada'
import type { DatosMail } from '@/emails/tipos'
import { esMarcador, VENDEDORA } from '@/lib/vendedora'

export type TipoMail = 'nueva_venta_duena' | 'confirmacion_cliente' | 'transferencia_completada' | 'venta_cancelada'
const EMAIL_VALIDO = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
export const pesos = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export type MailArmado = { para: string; asunto: string; reply?: string; react: ReactElement }

/** A dónde llegan las respuestas de los mails a clientes: RESEND_REPLY_TO si está cargado; si no, el email de contacto de lib/vendedora.ts. */
export function emailDeRespuestas(): string | undefined {
  const r = process.env.RESEND_REPLY_TO?.trim()
  if (r && EMAIL_VALIDO.test(r)) return r
  return !esMarcador(VENDEDORA.emailContacto) && EMAIL_VALIDO.test(VENDEDORA.emailContacto) ? VENDEDORA.emailContacto : undefined
}

export function armar(tipo: TipoMail, d: DatosMail, prueba: boolean, emailAvisos: string | null): MailArmado {
  const pref = prueba ? '[PRUEBA] ' : ''
  const respuestas = emailDeRespuestas()
  if (tipo === 'nueva_venta_duena') {
    const para = emailAvisos
    if (!para) throw new Error('Falta configuracion/general.emailAvisos')
    return { para, asunto: `${pref}Venta nueva ${d.pedidoId}: ${pesos(d.total)} (${d.metodoPago === 'transferencia' ? 'transferencia' : 'Mercado Pago'})`, reply: EMAIL_VALIDO.test(d.cliente.email) ? d.cliente.email : undefined, react: NuevaVentaDuena({ d }) }
  }
  if (!EMAIL_VALIDO.test(d.cliente.email)) throw new Error('La venta no tiene un email de cliente válido')
  if (tipo === 'confirmacion_cliente') {
    return { para: d.cliente.email, reply: respuestas, asunto: `${pref}${d.metodoPago === 'transferencia' ? `Recibimos tu pedido ${d.pedidoId}: falta tu transferencia` : `Recibimos tu pago: pedido ${d.pedidoId}`}`, react: ConfirmacionCliente({ d }) }
  }
  if (tipo === 'venta_cancelada') {
    return { para: d.cliente.email, reply: respuestas, asunto: `${pref}Cancelamos tu pedido ${d.pedidoId}`, react: VentaCancelada({ d }) }
  }
  return { para: d.cliente.email, reply: respuestas, asunto: `${pref}Recibimos tu transferencia: pedido ${d.pedidoId}`, react: TransferenciaCompletada({ d }) }
}

/** Manda el mail por Resend. Lanza si falla (el que llama lo registra). */
export async function mandar(a: MailArmado): Promise<string | undefined> {
  const clave = process.env.RESEND_API_KEY?.trim()
  const desde = process.env.RESEND_FROM_EMAIL?.trim()
  if (!clave || !desde) throw new Error('RESEND_API_KEY o RESEND_FROM_EMAIL sin configurar')
  const [html, text] = await Promise.all([render(a.react), render(a.react, { plainText: true })])
  const { data, error } = await new Resend(clave).emails.send({ from: desde, to: a.para, subject: a.asunto, html, text, ...(a.reply ? { replyTo: a.reply } : {}) })
  if (error) throw new Error(`${error.name}: ${error.message}`)
  return data?.id
}

