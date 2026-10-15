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
process.exit(0)
