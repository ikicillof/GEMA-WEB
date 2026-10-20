import { Timestamp } from 'firebase-admin/firestore'
import type { EstadoArrepentimiento } from '@/lib/server/arrepentimiento'

/** Una solicitud de arrepentimiento tal como la ve el panel (fechas en ISO). */
export type ArrepentimientoResumen = {
  tramite: string
  pedido: string
  nombre: string
  email: string
  motivo: string
  estado: EstadoArrepentimiento
  pedidoEncontrado: boolean
  emailCoincide: boolean
  mailsPendientes: boolean
  mailCliente: MailResumen
  mailDuena: MailResumen
  modoPrueba: boolean
  creadoEn: string | null
}

export type MailResumen = { estado: 'pendiente' | 'enviado' | 'error'; intentos: number; error: string | null }

/** Estado de un mail; las solicitudes viejas (antes de mailCliente/mailDuena) guardaban el estado en `emails.cliente` / `emails.duena`. */
function mail(nuevo: unknown, viejo: unknown): MailResumen {
  const m = (nuevo ?? viejo ?? {}) as { estado?: string; intentos?: number; error?: string }
  return { estado: m.estado === 'enviado' || m.estado === 'error' ? m.estado : 'pendiente', intentos: Number(m.intentos) || 0, error: m.estado === 'error' && m.error ? String(m.error) : null }
}

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : null)

export function aResumenArrepentimiento(id: string, x: FirebaseFirestore.DocumentData): ArrepentimientoResumen {
  return {
    tramite: id,
    pedido: String(x.pedido ?? ''),
    nombre: String(x.nombre ?? ''),
    email: String(x.email ?? ''),
    motivo: String(x.motivo ?? ''),
    estado: x.estado === 'en_gestion' || x.estado === 'resuelto' ? x.estado : 'recibido',
    pedidoEncontrado: x.pedidoEncontrado === true,
    emailCoincide: x.emailCoincide === true,
    mailsPendientes: x.mailsPendientes === true,
    mailCliente: mail(x.mailCliente, x.emails?.cliente),
    mailDuena: mail(x.mailDuena, x.emails?.duena),
    modoPrueba: x.modoPrueba === true,
    creadoEn: iso(x.creadoEn),
  }
}
