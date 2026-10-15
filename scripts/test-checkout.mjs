// Prueba de las rutas del checkout contra un servidor Next ya levantado (modo simulado de MiCorreo).
// Crea cuentas de prueba con el Admin SDK y las borra al final.
//   node --env-file=.env.local scripts/test-checkout.mjs http://localhost:3000
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const base = process.argv[2] || 'http://localhost:3000'
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const app = initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) })
const A = getAuth(app), D = getFirestore(app)
const sufijo = Date.now().toString(36)
const uids = []
let ok = 0, fallos = 0
const check = (nombre, cond, extra = '') => { cond ? ok++ : fallos++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${nombre}${cond ? '' : '  ' + extra}`) }

async function tokenDe(uid) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await A.createCustomToken(uid), returnSecureToken: true }) })
  return (await r.json()).idToken
}
async function llamar(metodo, ruta, token, cuerpo) {
  const r = await fetch(base + ruta, { method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

try {
  const u = await A.createUser({ email: `checkout-${sufijo}@gemma-test.invalid`, emailVerified: true, displayName: 'Test Checkout' })
  uids.push(u.uid)
  const t = await tokenDe(u.uid)
  const perro = c => ({ slug: 'perro-globo', color: 'Rojo', cantidad: c })

  console.log('--- Seguridad de acceso')
  for (const [m, r] of [['GET', '/api/carrito'], ['PUT', '/api/carrito'], ['GET', '/api/cuenta/envio'], ['POST', '/api/envio/cotizar'], ['GET', '/api/envio/sucursales?provincia=B&cp=1648'], ['POST', '/api/checkout/resumen']]) {
    check(`${m} ${r.split('?')[0]} sin sesión -> 401`, (await llamar(m, r)).status === 401)
  }
  // Cuenta de email y contraseña SIN verificar: tiene token válido pero no debe pasar.
  const reg = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `sinverificar-${sufijo}@gemma-test.invalid`, password: 'Prueba-' + sufijo + '!', returnSecureToken: true }) })).json()
  if (reg.localId) uids.push(reg.localId)
  check('cuenta de email sin verificar -> 403', (await llamar('GET', '/api/carrito', reg.idToken)).status === 403, JSON.stringify(reg).slice(0, 120))

  console.log('--- Carrito en la cuenta')
  let r = await llamar('PUT', '/api/carrito', t, { modo: 'fusionar', items: [perro(2), { slug: 'no-existe', color: 'Rojo', cantidad: 1 }, { slug: 'perro-globo', color: 'Dorado', cantidad: 1 }, { slug: 'lampara-diamante', color: 'Cualquiera', cantidad: 1 }] })
  const ids = (r.body.items ?? []).map(i => `${i.slug}/${i.color}/${i.quantity}`)
  check('descarta productos inexistentes y colores inválidos', r.status === 200 && ids.length === 2 && ids.includes('perro-globo/Rojo/2'), JSON.stringify(ids))
  check('el precio sale del catálogo', r.body.items?.find(i => i.slug === 'perro-globo')?.price === 10000)
  check('producto de color único: el color lo fija el servidor', r.body.items?.find(i => i.slug === 'lampara-diamante')?.color === 'único', JSON.stringify(ids))
  check('PUT con precio inventado -> 400', (await llamar('PUT', '/api/carrito', t, { modo: 'fusionar', items: [{ ...perro(1), precio: 1 }] })).status === 400)
  r = await llamar('PUT', '/api/carrito', t, { modo: 'fusionar', items: [perro(1)] })
  check('fusionar se queda con la mayor cantidad (no suma)', r.body.items?.find(i => i.slug === 'perro-globo')?.quantity === 2)
  check('GET devuelve el carrito guardado', (await llamar('GET', '/api/carrito', t)).body.items?.length === 2)
  r = await llamar('PUT', '/api/carrito', t, { modo: 'reemplazar', items: [perro(5)] })
  check('reemplazar deja exactamente lo enviado', r.body.items?.length === 1 && r.body.items[0].quantity === 5)

  console.log('--- Datos de envío')
  const datos = { nombre: 'Ana Prueba', dni: '30123456', telefono: '11 5555-1234', email: 'ana@example.com', calle: 'Av. Siempreviva', numero: '742', piso: '3B', localidad: 'Olivos', provincia: 'B', cp: '1636' }
  check('DNI inválido -> 400', (await llamar('PUT', '/api/cuenta/envio', t, { ...datos, dni: 'abc' })).status === 400)
  check('provincia inválida -> 400', (await llamar('PUT', '/api/cuenta/envio', t, { ...datos, provincia: 'ZZ' })).status === 400)
  check('campo extra -> 400', (await llamar('PUT', '/api/cuenta/envio', t, { ...datos, rol: 'admin' })).status === 400)
  check('guarda datos válidos', (await llamar('PUT', '/api/cuenta/envio', t, { ...datos, calle: '<b>Av. Siempreviva</b>' })).status === 200)
  const guardado = (await llamar('GET', '/api/cuenta/envio', t)).body.datos
  check('se guardan sin < > y se leen de vuelta', guardado?.calle === 'bAv. Siempreviva/b' && guardado.cp === '1636' && guardado.piso === '3B', JSON.stringify(guardado))

  console.log('--- Cotización y sucursales (simulado)')
  r = await llamar('POST', '/api/envio/cotizar', t, { cp: '1648', items: [perro(1)] })
  const dom = r.body.opciones?.find(o => o.modalidad === 'domicilio'), suc = r.body.opciones?.find(o => o.modalidad === 'sucursal')
  check('devuelve domicilio y sucursal con precio y plazo', r.status === 200 && dom?.precio > 0 && suc?.precio > 0 && dom.plazoMax >= dom.plazoMin && r.body.simulado === true, JSON.stringify(r.body))
  r = await llamar('POST', '/api/envio/cotizar', t, { cp: '1648', items: [perro(6)] })
  check('más peso, más caro', r.body.opciones?.find(o => o.modalidad === 'sucursal')?.precio > suc.precio)
  check('CP inválido -> 400', (await llamar('POST', '/api/envio/cotizar', t, { cp: '16', items: [perro(1)] })).status === 400)
  check('el navegador no puede mandar peso ni medidas -> 400', (await llamar('POST', '/api/envio/cotizar', t, { cp: '1648', items: [perro(1)], pesoGramos: 1 })).status === 400)
  r = await llamar('POST', '/api/envio/cotizar', t, { cp: '1648', items: [{ slug: 'lampara-diamante', color: 'x', cantidad: 40 }] })
  check('pedido que no entra en un envío -> 422 con opción WhatsApp', r.status === 422 && r.body.whatsapp === true, JSON.stringify(r))
  r = await llamar('GET', '/api/envio/sucursales?provincia=B&cp=1648', t)
  check('sucursales cercanas al CP', r.status === 200 && r.body.lista?.length >= 3 && r.body.lista[0].codigo, JSON.stringify(r.body).slice(0, 120))
  check('provincia inválida en sucursales -> 400', (await llamar('GET', '/api/envio/sucursales?provincia=ZZ&cp=1648', t)).status === 400)

  console.log('--- Resumen (todo recalculado en el servidor)')
  r = await llamar('POST', '/api/checkout/resumen', t, { items: [perro(2)], envio: { modalidad: 'domicilio', cp: '1648', provincia: 'B' } })
  const esperadoDom = (await llamar('POST', '/api/envio/cotizar', t, { cp: '1648', items: [perro(2)] })).body.opciones.find(o => o.modalidad === 'domicilio').precio
  const R = r.body
  check('subtotal = precio del catálogo x cantidad', R.subtotal === 20000, JSON.stringify(R).slice(0, 150))
  check('envío = cotización del servidor', R.envio?.precio === esperadoDom)
  check('total Mercado Pago = subtotal + envío', R.mercadoPago?.total === 20000 + esperadoDom)
  check('total transferencia = subtotal - descuento + envío', R.transferencia?.total === 20000 - R.transferencia.descuento + esperadoDom && R.transferencia.descuento === Math.round(20000 * R.transferencia.descuentoPct / 100), JSON.stringify(R.transferencia))
  check('intentar mandar total o precio -> 400', (await llamar('POST', '/api/checkout/resumen', t, { items: [perro(2)], total: 1 })).status === 400)
  check('sucursal que no existe -> 400', (await llamar('POST', '/api/checkout/resumen', t, { items: [perro(1)], envio: { modalidad: 'sucursal', cp: '1648', provincia: 'B', sucursal: 'INVENTADA' } })).status === 400)
  r = await llamar('POST', '/api/checkout/resumen', t, { items: [perro(1)], envio: { modalidad: 'sucursal', cp: '1648', provincia: 'B', sucursal: 'SIM1' } })
  check('sucursal válida queda en el resumen', r.status === 200 && r.body.envio?.sucursal?.codigo === 'SIM1')
  r = await llamar('POST', '/api/checkout/resumen', t, { items: [perro(1)] })
  check('sin envío elegido: total sin envío', r.status === 200 && r.body.envio === null && r.body.mercadoPago.total === 10000)
} catch (e) {
  fallos++
  console.log('ERROR inesperado:', e.message)
} finally {
  await Promise.all(uids.flatMap(uid => [D.doc('carritos/' + uid).delete().catch(() => {}), D.doc('users/' + uid).delete().catch(() => {})]))
  if (uids.length) await A.deleteUsers(uids)
  console.log(`\nLimpieza: ${uids.length} cuentas de prueba borradas.\nResultado: ${ok} OK, ${fallos} con fallas`)
  process.exit(fallos ? 1 : 0)
}
