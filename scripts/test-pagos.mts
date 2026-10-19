// Prueba de la lógica de pagos: reglas de estado, firma del webhook, webhook completo (con Mercado Pago simulado en
// memoria) e idempotencia sobre Firestore. Crea ventas de prueba (modoPrueba: true) y las borra al final.
//   npm run test:pagos
import { createHmac } from 'node:crypto'
import { siguienteEstado } from '../lib/pedidos'

process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token-falso'
process.env.MERCADOPAGO_WEBHOOK_SECRET = 'secreto-de-prueba'
delete process.env.MERCADOPAGO_API_URL

const { firmaValida } = await import('../lib/server/mercadopago')
const { aplicarPago, pedidos } = await import('../lib/server/pedidos')
const { POST } = await import('../app/api/mercadopago/webhook/route')

let ok = 0, fallos = 0
const check = (nombre: string, cond: boolean, extra = '') => { cond ? ok++ : fallos++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${nombre}${cond ? '' : '  ' + extra}`) }

console.log('--- Reglas de estado (una venta pagada nunca retrocede)')
check('approved desde pendiente -> pagado', siguienteEstado('pendiente_pago', 'approved', true).estado === 'pagado')
check('approved desde transferencia_en_proceso -> pagado', siguienteEstado('transferencia_en_proceso', 'approved', true).estado === 'pagado')
check('approved con monto distinto -> no cambia y pide revisión', JSON.stringify(siguienteEstado('pendiente_pago', 'approved', false)) === JSON.stringify({ estado: 'pendiente_pago', revision: true }))
check('rejected sobre pagado -> sigue pagado', siguienteEstado('pagado', 'rejected', true).estado === 'pagado')
check('refunded sobre pagado -> sigue pagado y pide revisión', siguienteEstado('pagado', 'refunded', true).revision === true && siguienteEstado('pagado', 'refunded', true).estado === 'pagado')
check('approved sobre completado -> sigue completado', siguienteEstado('completado', 'approved', true).estado === 'completado')
check('approved sobre cancelado -> pagado con revisión', JSON.stringify(siguienteEstado('cancelado', 'approved', true)) === JSON.stringify({ estado: 'pagado', revision: true }))
check('pending / in_process no cambian', siguienteEstado('pendiente_pago', 'pending', true).estado === 'pendiente_pago' && siguienteEstado('pendiente_pago', 'in_process', true).estado === 'pendiente_pago')

console.log('--- Firma x-signature')
const firmar = (id: string | null, requestId: string | null, ts = '1742505638683', secreto = 'secreto-de-prueba') =>
  createHmac('sha256', secreto).update(`${id ? `id:${id};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`).digest('hex')
const solicitud = (v1: string | null, opts: { ts?: string; requestId?: string | null } = {}) => new Request('http://x/api/mercadopago/webhook', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(v1 ? { 'x-signature': `ts=${opts.ts ?? '1742505638683'},v1=${v1}` } : {}), ...(opts.requestId === null ? {} : { 'x-request-id': opts.requestId ?? 'req-1' }) },
  body: '{}',
})
check('firma correcta', firmaValida(solicitud(firmar('123', 'req-1')), '123'))
check('firma correcta con id alfanumérico en mayúsculas (se firma en minúsculas)', firmaValida(solicitud(firmar('abc123', 'req-1')), 'ABC123'))
check('firma con otro secreto -> inválida', !firmaValida(solicitud(firmar('123', 'req-1', undefined, 'otro')), '123'))
check('id distinto al firmado -> inválida', !firmaValida(solicitud(firmar('123', 'req-1')), '124'))
check('ts alterado -> inválida', !firmaValida(solicitud(firmar('123', 'req-1'), { ts: '1' }), '123'))
check('request-id alterado -> inválida', !firmaValida(solicitud(firmar('123', 'req-1'), { requestId: 'req-2' }), '123'))
check('sin encabezado x-signature -> inválida', !firmaValida(solicitud(null), '123'))
check('v1 que no es hexadecimal -> inválida', !firmaValida(solicitud('zz'.repeat(32)), '123'))
check('v1 de otro largo -> inválida', !firmaValida(solicitud('ab'), '123'))

console.log('--- Webhook (Mercado Pago simulado) sobre Firestore')
const creadas: string[] = []
const nueva = async (extra: Record<string, unknown> = {}) => {
  const ref = pedidos().doc()
  creadas.push(ref.id)
  await ref.set({ uid: 'uid-de-prueba', estado: 'pendiente_pago', metodoPago: 'mercadopago', total: 25000, modoPrueba: true, historial: [], lineas: [], ...extra })
  return ref.id
}
let pagoActual: Record<string, unknown> = {}
let consultas = 0
const fetchReal = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url.startsWith('https://api.mercadopago.com/v1/payments/')) {
    consultas++
    const id = url.split('/').pop()
    if (id === '404404') return new Response('{}', { status: 404 })
    if (id === '500500') return new Response('{}', { status: 500 })
    return Response.json({ id: Number(id), currency_id: 'ARS', ...pagoActual })
  }
  return fetchReal(input, init)
}) as typeof fetch

const avisar = (dataId: string, opts: { firmar?: boolean; tipo?: string } = {}) => {
  const requestId = 'req-' + dataId
  const v1 = opts.firmar === false ? 'a'.repeat(64) : firmar(dataId, requestId)
  return POST(new Request(`http://x/api/mercadopago/webhook?data.id=${dataId}&type=${opts.tipo ?? 'payment'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': `ts=1742505638683,v1=${v1}`, 'x-request-id': requestId },
    body: JSON.stringify({ type: opts.tipo ?? 'payment', data: { id: dataId } }),
  }))
}
const leer = async (id: string) => (await pedidos().doc(id).get()).data()!

try {
  const id1 = await nueva()
  pagoActual = { status: 'approved', external_reference: id1, transaction_amount: 25000 }
  let r = await avisar('111')
  let d = await leer(id1)
  check('aviso firmado y aprobado -> la venta queda pagada', r.status === 200 && d.estado === 'pagado' && d.pagoId === '111' && d.mpStatus === 'approved', JSON.stringify({ s: r.status, e: d.estado }))
  check('queda un único registro en el historial', d.historial.length === 1)

  r = await avisar('111')
  const d2 = await leer(id1)
  check('el mismo aviso otra vez (idempotente): sin cambios ni historial duplicado', r.status === 200 && d2.historial.length === 1 && d2.estado === 'pagado')

  pagoActual = { status: 'rejected', external_reference: id1, transaction_amount: 25000 }
  await avisar('112')
  d = await leer(id1)
  check('un pago rechazado posterior NO retrocede la venta pagada ni pisa el pago aprobado', d.estado === 'pagado' && d.mpStatus === 'approved' && d.pagoId === '111', JSON.stringify({ e: d.estado, m: d.mpStatus, p: d.pagoId }))

  pagoActual = { status: 'refunded', external_reference: id1, transaction_amount: 25000 }
  await avisar('111')
  d = await leer(id1)
  check('devolución sobre venta pagada: sigue pagada y se marca para revisar', d.estado === 'pagado' && d.requiereRevision === true)

  const id2 = await nueva()
  pagoActual = { status: 'approved', external_reference: id2, transaction_amount: 1 }
  await avisar('120')
  d = await leer(id2)
  check('aprobado por un monto distinto al de la venta: NO se marca pagada y pide revisión', d.estado === 'pendiente_pago' && d.requiereRevision === true, JSON.stringify(d.estado))

  const id3 = await nueva({ metodoPago: 'transferencia', estado: 'transferencia_en_proceso' })
  pagoActual = { status: 'approved', external_reference: id3, transaction_amount: 25000 }
  await avisar('130')
  check('transferencia_en_proceso + pago aprobado -> pagado', (await leer(id3)).estado === 'pagado')

  const id4 = await nueva({ estado: 'completado' })
  pagoActual = { status: 'approved', external_reference: id4, transaction_amount: 25000 }
  await avisar('140')
  check('venta completada no cambia con un aviso aprobado', (await leer(id4)).estado === 'completado')

  const id5 = await nueva()
  pagoActual = { status: 'pending', external_reference: id5, transaction_amount: 25000 }
  await avisar('150')
  d = await leer(id5)
  check('pago pendiente: la venta sigue pendiente_pago y guarda el estado del pago', d.estado === 'pendiente_pago' && d.mpStatus === 'pending')

  const id6 = await nueva()
  pagoActual = { status: 'approved', external_reference: 'otra-venta-que-no-existe', transaction_amount: 25000 }
  r = await avisar('160')
  check('pago de una venta inexistente: 200 sin tocar nada', r.status === 200 && (await leer(id6)).estado === 'pendiente_pago')

  const antes = consultas
  r = await avisar('170', { firmar: false })
  check('firma inválida -> 401 y ni siquiera consulta a Mercado Pago', r.status === 401 && consultas === antes)
  r = await POST(new Request('http://x/api/mercadopago/webhook?data.id=170&type=payment', { method: 'POST', body: '{}' }))
  check('sin x-signature -> 401', r.status === 401)
  r = await avisar('180', { tipo: 'merchant_order' })
  check('tema que no es payment: 200 ignorado', r.status === 200 && (await r.json()).ignorado === true)
  r = await avisar('404404')
  check('pago inexistente en Mercado Pago (simulador): 200', r.status === 200)
  r = await avisar('500500')
  check('Mercado Pago caído -> 500 para que reintente', r.status === 500)

  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET
  r = await avisar('111')
  check('sin clave secreta configurada: rechaza todo (503)', r.status === 503)
  process.env.MERCADOPAGO_WEBHOOK_SECRET = secreto

  const res = await aplicarPago(id1, { id: 1, status: 'approved', external_reference: 'otra', transaction_amount: 25000, currency_id: 'ARS' })
  check('aplicarPago con external_reference ajena -> ajeno', res === 'ajeno')
} catch (e) {
  fallos++
  console.log('ERROR inesperado:', (e as Error).message)
} finally {
  globalThis.fetch = fetchReal
  await Promise.all(creadas.map(id => pedidos().doc(id).delete().catch(() => {})))
  console.log(`\nLimpieza: ${creadas.length} ventas de prueba borradas.\nResultado: ${ok} OK, ${fallos} con fallas`)
  process.exit(fallos ? 1 : 0)
}
