import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { ESTADOS, type EstadoPedido } from '@/lib/pedidos'
import type { Staff } from '@/lib/server/admin'

const ordenes = () => adminDb().collection('orders')
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : null)
const esEstado = (v: unknown): v is EstadoPedido => (ESTADOS as readonly unknown[]).includes(v)

export type VentaResumen = {
  id: string
  estado: EstadoPedido
  metodoPago: 'mercadopago' | 'transferencia'
  creadoEn: string | null
  total: number
  cliente: string
  email: string
  cantidad: number
  modoPrueba: boolean
  requiereRevision: boolean
  mailsPendientes: boolean
}

export function aResumen(id: string, d: FirebaseFirestore.DocumentData): VentaResumen {
  const e = d.datosEnvio ?? {}
  return {
    id,
    estado: esEstado(d.estado) ? d.estado : 'pendiente_pago',
    metodoPago: d.metodoPago === 'transferencia' ? 'transferencia' : 'mercadopago',
    creadoEn: iso(d.creadoEn),
    total: Number(d.total) || 0,
    cliente: String(e.nombre ?? ''),
    email: String(e.email ?? d.email ?? ''),
    cantidad: (Array.isArray(d.lineas) ? d.lineas : []).reduce((s: number, l: { quantity?: number }) => s + (Number(l.quantity) || 0), 0),
    modoPrueba: d.modoPrueba === true,
    requiereRevision: d.requiereRevision === true,
    mailsPendientes: d.mailsPendientes === true,
  }
}

/** Detalle para el panel (solo equipo): datos de contacto completos, historial y estado de los mails. */
export function aDetalle(id: string, d: FirebaseFirestore.DocumentData) {
  const e = d.datosEnvio ?? {}
  const emails = (d.emails ?? {}) as Record<string, { estado?: string; intentos?: number; error?: string }>
  return {
    ...aResumen(id, d),
    lineas: Array.isArray(d.lineas) ? d.lineas : [],
    subtotal: Number(d.subtotal) || 0,
    descuento: Number(d.descuento) || 0,
    envio: d.envio ?? null,
    cotizacionSimulada: d.cotizacionSimulada === true,
    cliente: String(e.nombre ?? ''),
    contacto: { nombre: String(e.nombre ?? ''), dni: String(e.dni ?? ''), telefono: String(e.telefono ?? ''), email: String(e.email ?? d.email ?? '') },
    entrega: { calle: e.calle ?? '', numero: e.numero ?? '', piso: e.piso ?? '', localidad: e.localidad ?? '', provincia: e.provincia ?? '', cp: e.cp ?? '' },
    historial: Array.isArray(d.historial) ? d.historial.map((h: { estado?: string; en?: string; motivo?: string }) => ({ estado: String(h.estado ?? ''), en: String(h.en ?? ''), motivo: String(h.motivo ?? '') })) : [],
    mpStatus: typeof d.mpStatus === 'string' ? d.mpStatus : null,
    pagoId: typeof d.pagoId === 'string' ? d.pagoId : null,
    motivoCancelacion: typeof d.motivoCancelacion === 'string' ? d.motivoCancelacion : null,
    mails: Object.fromEntries(Object.entries(emails).map(([tipo, m]) => [tipo, { estado: String(m.estado ?? ''), intentos: Number(m.intentos) || 0, error: m.error ? String(m.error) : null }])),
  }
}

export type ResultadoCancelar = 'cancelada' | 'no_existe' | 'estado_invalido'

/** Cancela una venta que todavía no se cobró (pendiente de pago o esperando la transferencia). Una venta cobrada nunca se cancela desde acá. */
export async function cancelarVenta(id: string, motivo: string, staff: Staff): Promise<ResultadoCancelar> {
  const ref = ordenes().doc(id)
  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return 'no_existe' as const
    const actual = snap.data()?.estado
    if (actual !== 'pendiente_pago' && actual !== 'transferencia_en_proceso') return 'estado_invalido' as const
    const estado: EstadoPedido = 'cancelado'
    tx.update(ref, {
      estado,
      motivoCancelacion: motivo,
      historial: FieldValue.arrayUnion({ estado, en: new Date().toISOString(), motivo: `Cancelada por ${staff.email}: ${motivo}` }),
      actualizadoEn: FieldValue.serverTimestamp(),
    })
    return 'cancelada' as const
  })
}
