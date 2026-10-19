// Prueba de punta a punta del pago contra un servidor Next ya levantado, con un Mercado Pago SIMULADO en este mismo script.
// El servidor tiene que arrancar con: MERCADOPAGO_API_URL=http://localhost:4010 MERCADOPAGO_ACCESS_TOKEN=TEST-token-falso
//   MERCADOPAGO_WEBHOOK_SECRET=secreto-e2e SITE_URL=http://localhost:3111 MICORREO_MODO=simulado
//   node --env-file=.env.local scripts/test-pedido.mjs http://localhost:3111
// Crea cuentas y ventas de prueba (modoPrueba) y las borra al final (también prueba npm run limpiar:pruebas).
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const base = process.argv[2] || 'http://localhost:3111'
const SECRETO = 'secreto-e2e'
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const app = initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) })
const A = getAuth(app), D = getFirestore(app)
const sufijo = Date.now().toString(36)
const uids = [], pedidosCreados = []
let ok = 0, fallos = 0
const check = (nombre, cond, extra = '') => { cond ? ok++ : fallos++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${nombre}${cond ? '' : '  ' + extra}`) }

// --- Mercado Pago simulado
const mp = { preferencias: [], pagos: new Map(), busqueda: [], fallarPreferencia: false }
const servidorMP = createServer((req, res) => {
  let cuerpo = ''
  req.on('data', c => { cuerpo += c })
  req.on('end', () => {
    const responder = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }
    if (req.headers.authorization !== 'Bearer TEST-token-falso') return responder(401, {})
    const url = new URL(req.url, 'http://x')
    if (req.method === 'POST' && url.pathname === '/checkout/preferences') {
      if (mp.fallarPreferencia) return responder(500, {})
      const pref = JSON.parse(cuerpo); pref._idem = req.headers['x-idempotency-key']; mp.preferencias.push(pref)
      return responder(201, { id: `pref-${mp.preferencias.length}`, init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-${mp.preferencias.length}` })
    }
    if (url.pathname === '/v1/payments/search') return responder(200, { results: mp.busqueda.filter(p => p.external_reference === url.searchParams.get('external_reference')) })
    const m = /^\/v1\/payments\/(\d+)$/.exec(url.pathname)
    if (m) return mp.pagos.has(m[1]) ? responder(200, mp.pagos.get(m[1])) : responder(404, {})
    responder(404, {})
  })
})
await new Promise(r => servidorMP.listen(4010, r))

async function tokenDe(uid) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await A.createCustomToken(uid), returnSecureToken: true }) })
  return (await r.json()).idToken
}
async function llamar(metodo, ruta, token, cuerpo, extra = {}) {
  const r = await fetch(base + ruta, { method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...extra }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
const firma = (id, requestId, secreto = SECRETO) => `ts=1742505638683,v1=${createHmac('sha256', secreto).update(`id:${id};request-id:${requestId};ts:1742505638683;`).digest('hex')}`
const avisar = (id, secreto) => llamar('POST', `/api/mercadopago/webhook?data.id=${id}&type=payment`, null, { type: 'payment', data: { id } }, { 'x-signature': firma(id, 'req-' + id, secreto), 'x-request-id': 'req-' + id })

const datos = { nombre: 'Ana Prueba', dni: '30123456', telefono: '11 5555-1234', email: 'ana@example.com', calle: 'Av. Siempreviva', numero: '742', piso: '3B', localidad: 'Olivos', provincia: 'B', cp: '1636' }
const items = [{ slug: 'perro-globo', color: 'Rojo', cantidad: 2 }]
const pedidoBody = (metodoPago, extra = {}) => ({ items, envio: { modalidad: 'domicilio', cp: '1636', provincia: 'B' }, datosEnvio: datos, metodoPago, ...extra })

try {
  const u1 = await A.createUser({ email: `pedido-${sufijo}@gemma-test.invalid`, emailVerified: true, displayName: 'Test Pedido' })
  const u2 = await A.createUser({ email: `otro-${sufijo}@gemma-test.invalid`, emailVerified: true, displayName: 'Test Otro' })
  uids.push(u1.uid, u2.uid)
  const t1 = await tokenDe(u1.uid), t2 = await tokenDe(u2.uid)

  console.log('--- Acceso y validación')
  check('crear pedido sin sesión -> 401', (await llamar('POST', '/api/checkout/pedido', null, pedidoBody('mercadopago'))).status === 401)
  check('listar compras sin sesión -> 401', (await llamar('GET', '/api/pedidos')).status === 401)
  check('intentar mandar el total -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { total: 1 }))).status === 400)
  check('intentar mandar precios en los items -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { items: [{ ...items[0], precio: 1 }] }))).status === 400)
  check('forma de pago inventada -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('bitcoin'))).status === 400)
  check('código postal de envío distinto al de la dirección -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { envio: { modalidad: 'domicilio', cp: '1000', provincia: 'B' } }))).status === 400)
  check('envío a sucursal sin elegir sucursal -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { envio: { modalidad: 'sucursal', cp: '1636', provincia: 'B' } }))).status === 400)
  check('sucursal que no existe -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { envio: { modalidad: 'sucursal', cp: '1636', provincia: 'B', sucursal: 'INVENTADA' } }))).status === 400)
  check('producto inexistente -> 400', (await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago', { items: [{ slug: 'no-existe', color: 'Rojo', cantidad: 1 }] }))).status === 400)

  // El límite de /api/checkout/pedido es de 10 por minuto por IP: se espera a que se renueve la ventana.
  console.log('(esperando 61 s a que se renueve el límite por minuto)')
  await new Promise(r => setTimeout(r, 61000))
  console.log('--- Mercado Pago: preferencia con montos del servidor')
  let r = await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago'))
  check('crea la venta y devuelve la URL de Mercado Pago', r.status === 201 && /^https:\/\/www\.mercadopago\.com\.ar\//.test(r.body.url ?? '') && !!r.body.pedidoId, JSON.stringify(r.body))
  const idMP = r.body.pedidoId
  pedidosCreados.push(idMP)
  const pref = mp.preferencias[0]
  const sumaItems = pref?.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const doc1 = (await D.doc('orders/' + idMP).get()).data()
  check('la venta queda pendiente_pago y marcada modoPrueba', doc1?.estado === 'pendiente_pago' && doc1.modoPrueba === true && doc1.uid === u1.uid, JSON.stringify({ e: doc1?.estado, m: doc1?.modoPrueba }))
  check('productos al precio del catálogo (2 x 10000) y envío sumado como ítem', pref?.items[0].unit_price === 10000 && pref.items[0].quantity === 2 && pref.items.length === 2 && pref.items[1].unit_price === doc1.envio.precio, JSON.stringify(pref?.items))
  check('suma de la preferencia = total de la venta = subtotal + envío', sumaItems === doc1.total && doc1.total === 20000 + doc1.envio.precio, JSON.stringify({ sumaItems, total: doc1.total }))
  check('external_reference = id de la venta; notificación y retornos salen de SITE_URL', pref?.external_reference === idMP && pref.notification_url === 'http://localhost:3111/api/mercadopago/webhook' && pref.back_urls?.success?.startsWith('http://localhost:3111/checkout/resultado?pedido=' + idMP), JSON.stringify({ n: pref?.notification_url, b: pref?.back_urls }))
  check('la preferencia usa clave de idempotencia', pref?._idem === 'pref-' + idMP)
  check('se guarda el id de la preferencia', doc1.preferenciaId === 'pref-1')

  console.log('--- Transferencia')
  r = await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('transferencia'))
  const idTr = r.body.pedidoId; pedidosCreados.push(idTr)
  const docTr = (await D.doc('orders/' + idTr).get()).data()
  check('queda transferencia_en_proceso, con 10 % de descuento solo en productos', r.status === 201 && docTr.estado === 'transferencia_en_proceso' && docTr.descuento === 2000 && docTr.total === 20000 - 2000 + docTr.envio.precio, JSON.stringify({ s: r.status, d: docTr?.descuento, t: docTr?.total }))
  check('transferencia no crea preferencia en Mercado Pago', mp.preferencias.length === 1)

  console.log('--- Lectura (solo el dueño, sin datos internos)')
  r = await llamar('GET', '/api/pedidos/' + idTr, t1)
  check('el dueño ve su compra con las instrucciones de transferencia', r.status === 200 && r.body.pedido.estado === 'transferencia_en_proceso' && typeof r.body.pedido.instruccionesTransferencia === 'string', JSON.stringify(r.body).slice(0, 200))
  check('otra persona no puede ver la compra (404)', (await llamar('GET', '/api/pedidos/' + idTr, t2)).status === 404)
  check('id mal formado -> 404', (await llamar('GET', '/api/pedidos/..%2F..%2Fusers', t1)).status === 404)
  r = await llamar('GET', '/api/pedidos', t1)
  const crudo = JSON.stringify(r.body)
  check('Mis compras lista las dos', r.status === 200 && r.body.pedidos.length === 2)
  check('no se filtran DNI, teléfono, uid ni ids de pago', !crudo.includes('30123456') && !crudo.includes('5555-1234') && !crudo.includes(u1.uid) && !/pagoId|preferenciaId|mpStatus|requiereRevision/.test(crudo))
  check('la otra persona no ve compras ajenas', (await llamar('GET', '/api/pedidos', t2)).body.pedidos.length === 0)

  console.log('--- Webhook por HTTP')
  mp.pagos.set('9001', { id: 9001, status: 'approved', external_reference: idMP, transaction_amount: doc1.total, currency_id: 'ARS' })
  check('firma inválida (otro secreto) -> 401 y la venta no cambia', (await avisar('9001', 'otro-secreto')).status === 401 && (await D.doc('orders/' + idMP).get()).data().estado === 'pendiente_pago')
  check('sin firma -> 401', (await llamar('POST', '/api/mercadopago/webhook?data.id=9001&type=payment', null, { type: 'payment', data: { id: '9001' } })).status === 401)
  r = await avisar('9001')
  check('aviso firmado y aprobado -> pagado', r.status === 200 && (await D.doc('orders/' + idMP).get()).data().estado === 'pagado', JSON.stringify(r))
  await avisar('9001')
  check('repetir el aviso no duplica el historial', (await D.doc('orders/' + idMP).get()).data().historial.length === 2)
  check('Mis compras muestra la venta como pagada', (await llamar('GET', '/api/pedidos', t1)).body.pedidos.find(p => p.id === idMP)?.estado === 'pagado')

  console.log('--- Red de seguridad si el webhook se demora')
  r = await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago'))
  const idSync = r.body.pedidoId; pedidosCreados.push(idSync)
  const totalSync = (await D.doc('orders/' + idSync).get()).data().total
  mp.busqueda.push({ id: 9002, status: 'approved', external_reference: idSync, transaction_amount: totalSync, currency_id: 'ARS' })
  r = await llamar('GET', '/api/pedidos/' + idSync, t1)
  check('al volver del pago, si MP ya aprobó pero no llegó el webhook, se actualiza sola', r.status === 200 && r.body.pedido.estado === 'pagado', JSON.stringify(r.body).slice(0, 150))

  console.log('--- Falla de Mercado Pago')
  mp.fallarPreferencia = true
  r = await llamar('POST', '/api/checkout/pedido', t1, pedidoBody('mercadopago'))
  const cancelada = (await D.collection('orders').where('uid', '==', u1.uid).get()).docs.filter(d => d.data().estado === 'cancelado')
  cancelada.forEach(d => pedidosCreados.push(d.id))
  check('si no se puede crear la preferencia: 502 y la venta queda cancelada', r.status === 502 && cancelada.length === 1, JSON.stringify({ s: r.status, c: cancelada.length }))
  mp.fallarPreferencia = false

  console.log('--- Carrito de prueba')
  r = await llamar('PUT', '/api/carrito', t1, { modo: 'reemplazar', items })
  check('el carrito guardado con credenciales de prueba queda con modoPrueba: true', r.status === 200 && (await D.doc('carritos/' + u1.uid).get()).data()?.modoPrueba === true)

  console.log('--- npm run limpiar:pruebas')
  const salida = execFileSync('npm', ['run', 'limpiar:pruebas', '--', '--confirmar'], { encoding: 'utf8', shell: true })
  check('el script borra ventas y carritos de prueba', /orders: \d+ de prueba/.test(salida) && (await D.doc('orders/' + idMP).get()).exists === false && (await D.doc('carritos/' + u1.uid).get()).exists === false, salida.slice(-200))
} catch (e) {
  fallos++
  console.log('ERROR inesperado:', e.message)
} finally {
  servidorMP.close()
  await Promise.all([...pedidosCreados.map(id => D.doc('orders/' + id).delete().catch(() => {})), ...uids.flatMap(uid => [D.doc('carritos/' + uid).delete().catch(() => {}), D.doc('users/' + uid).delete().catch(() => {})])])
  if (uids.length) await A.deleteUsers(uids)
  console.log(`\nLimpieza: ${uids.length} cuentas de prueba borradas.\nResultado: ${ok} OK, ${fallos} con fallas`)
  process.exit(fallos ? 1 : 0)
}
