// Crea la estructura inicial de Firestore con el Admin SDK (nunca desde el navegador).
// Es idempotente: si un documento ya existe, no lo toca. Uso: npm run seed:firestore
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
})
const db = getFirestore(app)

// users/{uid}: lo crea el servidor en el primer ingreso (/api/auth/sync).
// productos, ventas y auditoria se llenan en los próximos pasos; acá solo la configuración base.
const iniciales = [
  ['configuracion/general', { nombreTienda: 'Gemma', moneda: 'ARS', tiendaActiva: true, creadoEn: FieldValue.serverTimestamp() }],
]

for (const [ruta, datos] of iniciales) {
  try {
    await db.doc(ruta).create(datos)
    console.log('creado  ', ruta)
  } catch (e) {
    if (e.code !== 6) throw e
    console.log('ya existe', ruta)
  }
}
// Campos de configuración que se agregan después de crear el documento (solo si faltan).
const cfg = db.doc('configuracion/general')
if ((await cfg.get()).get('descuentoTransferenciaPct') === undefined) {
  await cfg.set({ descuentoTransferenciaPct: 10 }, { merge: true })
  console.log('agregado  configuracion/general.descuentoTransferenciaPct = 10 (provisorio, lo define la dueña)')
}
// Datos de EJEMPLO para la transferencia, el WhatsApp y los avisos. Provisorios: hay que reemplazarlos por los reales (ver docs/estado-backend.md).
const actual = await cfg.get()
const provisorios = {}
if (actual.get('datosTransferencia') === undefined) provisorios.datosTransferencia = { alias: 'gemma.tienda.ejemplo', titular: 'Titular de ejemplo', banco: 'Banco de ejemplo', provisorio: true }
if (actual.get('whatsapp') === undefined) provisorios.whatsapp = '5491128397462'
if (actual.get('emailAvisos') === undefined) provisorios.emailAvisos = 'ikicillof@gmail.com'
if (Object.keys(provisorios).length) {
  await cfg.set({ ...provisorios, datosProvisorios: true }, { merge: true })
  console.log('agregado  configuracion/general:', Object.keys(provisorios).join(', '), '(PROVISORIOS, reemplazar por los reales)')
}
process.exit(0)
