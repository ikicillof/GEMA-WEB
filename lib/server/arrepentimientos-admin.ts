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
  creadoEn: string | null
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
    creadoEn: iso(x.creadoEn),
  }
}
