// Prueba de las novedades: token de baja, seguridad del formato, cupo diario, bajas posteriores y un envío REAL de un lote a tu casilla.
// Crea documentos de prueba (users/test-nov-*, una campaña) y los borra al final. Si hay una campaña activa de verdad, se aborta.
// Uso: npm run test:novedades -- tucasilla+novedades@gmail.com
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '../lib/firebase/admin'
import { conBaja, renderizar } from '../lib/server/novedades-admin'
import { firmarBaja, verificarBaja } from '../lib/server/novedades-token'
import { procesarCola, tokenBaja } from '../netlify/lib/novedades-core.mjs'

const destino = process.argv[2]
if (!destino || !destino.includes('@')) { console.error('Falta el email de destino: npm run test:novedades -- tucasilla+novedades@gmail.com'); process.exit(1) }

let fallos = 0
const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'OK   ' : 'FALLA'} ${msg}`); if (!cond) fallos++ }

// 1) Token de baja: lo arma la función de Netlify y lo verifica la web (mismo algoritmo en las dos puntas).
const uid = 'abc123XYZ'
ok(verificarBaja(tokenBaja(uid)) === uid, 'el token que arma la función se verifica en la web')
ok(tokenBaja(uid) === firmarBaja(uid), 'la función y la web firman igual')
const t = tokenBaja(uid)
ok(verificarBaja(t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a')) === null, 'un token con la firma alterada no vale')
ok(verificarBaja(`otro.${t.split('.')[1]}`) === null, 'la firma de una persona no sirve para otra')
ok(verificarBaja('basura') === null && verificarBaja('') === null && verificarBaja('.x') === null, 'tokens mal formados no valen')

// 2) Formato: nada de HTML ni de links peligrosos.
const malo = 'Hola <script>alert(1)</script> **fuerte** [ok](https://gemma-oficial.com.ar) [mal](javascript:alert(1))\n\nSegundo párrafo'
const { html, texto } = await renderizar({ asunto: 'Novedades <b>de ensayo</b>', mensaje: malo, imagen: null })
ok(!html.includes('<script>'), 'un <script> escrito en el mensaje no llega como HTML')
ok(html.includes('&lt;script&gt;'), '…queda escapado como texto')
ok(html.includes('<strong>fuerte</strong>'), 'la negrita funciona')
ok(html.includes('href="https://gemma-oficial.com.ar"'), 'los links https funcionan')
ok(!/href="javascript:/i.test(html), 'un link javascript: no se convierte en link')
ok(html.includes('__BAJA_URL__') && texto.includes('__BAJA_URL__'), 'el mail lleva la marca del link de baja (HTML y texto)')
ok(!conBaja(html, 'https://x.test/baja?t=1').includes('__BAJA_URL__'), 'la marca se reemplaza por el link de cada persona')

// 3) Cola, cupo y bajas contra Firestore real.
const d = adminDb()
const activas = await d.collection('novedades').where('estado', 'in', ['preparando', 'en_cola', 'enviando']).get()
if (!activas.empty) { console.error('Hay una campaña activa de verdad: no se corre la prueba para no tocarla.'); process.exit(1) }

const s = Date.now().toString(36)
const u1 = `test-nov-${s}-1`, u2 = `test-nov-${s}-2`
const camp = d.collection('novedades').doc()
const cuota = d.doc(`mailsDiarios/${new Date().toISOString().slice(0, 10)}`)
try {
  await d.collection('users').doc(u1).set({ nombre: 'Prueba', email: destino, recibeNovedades: true })
  await d.collection('users').doc(u2).set({ nombre: 'Se dio de baja', email: `baja+${s}@example.com`, recibeNovedades: false })
  await camp.set({
    asunto: '[PRUEBA] Novedades de ensayo', mensaje: malo, imagen: null, html, texto, total: 2, enviados: 0, fallidos: 0, omitidos: 0,
    estado: 'en_cola', creadoPor: { uid: 'test', email: 'test' }, creadoEn: Timestamp.now(), bloqueadoHasta: 0, terminadoEn: null, ultimoError: null,
  })
  await camp.collection('destinatarios').doc(u1).set({ email: destino, estado: 'pendiente', intentos: 0 })
  await camp.collection('destinatarios').doc(u2).set({ email: `baja+${s}@example.com`, estado: 'pendiente', intentos: 0 })

  // Cupo agotado (se reservan 100000 para ventas): no manda nada y la campaña sigue en cola.
  process.env.NOVEDADES_RESERVA_VENTAS = '100000'
  let r = await procesarCola({ maxMs: 30_000 })
  let c = (await camp.get()).data()!
  ok(r.motivo === 'cupo' && c.estado === 'en_cola' && c.enviados === 0, 'sin cupo no se manda nada y la campaña queda en cola')
  ok(typeof c.ultimoError === 'string' && c.ultimoError.includes('mañana'), '…y dice que sigue mañana')

  // Con cupo: manda a quien sigue suscripto y omite a quien se dio de baja.
  process.env.NOVEDADES_RESERVA_VENTAS = '0'
  const antes = Number((await cuota.get()).get('enviados')) || 0
  r = await procesarCola({ maxMs: 90_000 })
  c = (await camp.get()).data()!
  const d1 = (await camp.collection('destinatarios').doc(u1).get()).data()!
  const d2 = (await camp.collection('destinatarios').doc(u2).get()).data()!
  ok(c.enviados === 1 && c.omitidos === 1 && c.fallidos === 0, `se mandó 1 y se omitió 1 (enviados=${c.enviados}, omitidos=${c.omitidos}, fallidos=${c.fallidos})`)
  ok(c.estado === 'completado', `la campaña termina en «completado» (estado=${c.estado})`)
  ok(d1.estado === 'enviado' && !!d1.resendId, `quien sigue suscripto queda «enviado» con id de Resend (${d1.resendId ?? 'sin id'})`)
  ok(d2.estado === 'baja', 'quien se dio de baja después de armar la campaña NO recibe el mail')
  const despues = Number((await cuota.get()).get('enviados')) || 0
  ok(despues === antes + 1, `el contador diario subió exactamente 1 (${antes} → ${despues})`)

  // Idempotencia: volver a correr no reenvía.
  r = await procesarCola({ maxMs: 20_000 })
  ok(r.motivo === 'sin-campana', 'volver a correr no reenvía nada')
} catch (e) {
  console.error('ERROR en la prueba:', (e as Error).message)
  fallos++
} finally {
  for (const doc of (await camp.collection('destinatarios').get()).docs) await doc.ref.delete()
  await camp.delete()
  await d.collection('users').doc(u1).delete()
  await d.collection('users').doc(u2).delete()
  console.log('(documentos de prueba borrados)')
}
console.log(fallos ? `\n${fallos} FALLA(S)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
