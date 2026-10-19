import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Cliente mínimo de Mercado Pago (Checkout Pro). Solo servidor: el access token y la clave del webhook nunca van al navegador.
// MERCADOPAGO_API_URL existe solo para las pruebas automáticas (apunta a un Mercado Pago simulado); en producción no se define.
const API = process.env.MERCADOPAGO_API_URL?.trim() || 'https://api.mercadopago.com'
const TIMEOUT_MS = 8000

export class ErrorMercadoPago extends Error {
  constructor(mensaje: string, readonly status?: number) { super(mensaje) }
}

const token = () => process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? ''

export const mercadoPagoConfigurado = () => !!token()

/**
 * ¿Las ventas y carritos de este despliegue son de prueba? Se pueden forzar con PAGOS_MODO_PRUEBA=true/false;
 * si no está, se deduce del access token (las credenciales de prueba empiezan con TEST-).
 */
export function esModoPrueba(): boolean {
  const forzado = process.env.PAGOS_MODO_PRUEBA?.trim().toLowerCase()
  if (forzado === 'true') return true
  if (forzado === 'false') return false
  return token().startsWith('TEST-')
}

/** URL pública del sitio (SITE_URL). De acá salen las URLs de retorno y del webhook; nunca del encabezado Host de la solicitud. */
export function urlDelSitio(): string | null {
  const v = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  if (!v) return null
  try {
    const u = new URL(v)
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null
    return u.origin
  } catch { return null }
}

async function pedir<T>(ruta: string, init: RequestInit & { idempotencia?: string } = {}): Promise<T> {
  if (!token()) throw new ErrorMercadoPago('Mercado Pago no está configurado')
  const { idempotencia, ...resto } = init
  let res: Response
  try {
    res = await fetch(API + ruta, {
      ...resto,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ErrorMercadoPago('No hubo respuesta de Mercado Pago')
  }
  if (!res.ok) throw new ErrorMercadoPago(`Mercado Pago respondió ${res.status}`, res.status)
  return (await res.json()) as T
}

export type ItemPreferencia = { title: string; quantity: number; unit_price: number }

export type PreferenciaCreada = { id: string; init_point: string; sandbox_init_point?: string }

export async function crearPreferencia(datos: {
  pedidoId: string
  items: ItemPreferencia[]
  email: string
  nombre: string
  urlSitio: string
}): Promise<PreferenciaCreada> {
  const { urlSitio, pedidoId } = datos
  const volver = (r: string) => `${urlSitio}/checkout/resultado?pedido=${encodeURIComponent(pedidoId)}&r=${r}`
  return pedir<PreferenciaCreada>('/checkout/preferences', {
    method: 'POST',
    idempotencia: `pref-${pedidoId}`,
    body: JSON.stringify({
      items: datos.items.map((i, n) => ({ id: String(n + 1), title: i.title.slice(0, 250), quantity: i.quantity, unit_price: i.unit_price, currency_id: 'ARS' })),
      payer: { email: datos.email, name: datos.nombre },
      external_reference: pedidoId,
      metadata: { pedido: pedidoId },
      notification_url: `${urlSitio}/api/mercadopago/webhook`,
      back_urls: { success: volver('ok'), pending: volver('pendiente'), failure: volver('error') },
      auto_return: 'approved',
      statement_descriptor: 'GEMMA',
    }),
  })
}

/** Lo que usamos de un pago de Mercado Pago. */
export type PagoMP = {
  id: number
  status: string
  status_detail?: string
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  live_mode?: boolean
}

export const obtenerPago = (id: string) => pedir<PagoMP>(`/v1/payments/${encodeURIComponent(id)}`)

/** Pagos asociados a una venta (para recuperar el estado si el webhook se demora). */
export async function pagosDeLaVenta(pedidoId: string): Promise<PagoMP[]> {
  const r = await pedir<{ results?: PagoMP[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc&limit=10`)
  return r.results ?? []
}

/**
 * Valida la firma `x-signature` de una notificación: HMAC-SHA256 (hex) del texto
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con la clave secreta del webhook.
 * Sin clave configurada devuelve false: se rechaza todo lo que no se pueda comprobar.
 */
export function firmaValida(req: Request, dataId: string | null): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  const cabecera = req.headers.get('x-signature')
  if (!secreto || !cabecera) return false
  let ts = '', v1 = ''
  for (const parte of cabecera.split(',')) {
    const [k, ...v] = parte.split('=')
    const valor = v.join('=').trim()
    if (k.trim() === 'ts') ts = valor
    else if (k.trim() === 'v1') v1 = valor
  }
  if (!ts || !/^[0-9a-f]{64}$/i.test(v1)) return false
  // Si el id es alfanumérico, Mercado Pago lo firma en minúsculas.
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const requestId = req.headers.get('x-request-id')
  const manifiesto = `${id ? `id:${id};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`
  const esperada = createHmac('sha256', secreto).update(manifiesto).digest()
  const recibida = Buffer.from(v1, 'hex')
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada)
}
