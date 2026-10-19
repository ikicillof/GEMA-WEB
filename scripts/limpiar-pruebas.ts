// Borra los datos creados con credenciales de PRUEBA: ventas (orders) y carritos marcados con modoPrueba: true.
// Correrlo antes de publicar. Sin --confirmar solo cuenta lo que borraría.
//   npm run limpiar:pruebas              (simulacro)
//   npm run limpiar:pruebas -- --confirmar
// Nunca toca documentos sin modoPrueba: true.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLECCIONES = ['orders', 'carritos'] as const
const confirmar = process.argv.includes('--confirmar')

const db = getFirestore(initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
}))

async function main() {
  let total = 0
  for (const nombre of COLECCIONES) {
    // La consulta ya filtra por modoPrueba == true; se vuelve a comprobar cada documento antes de borrarlo.
    const snap = await db.collection(nombre).where('modoPrueba', '==', true).get()
    const docs = snap.docs.filter(d => d.data().modoPrueba === true)
    console.log(`${nombre}: ${docs.length} de prueba`)
    total += docs.length
    if (!confirmar) continue
    for (let i = 0; i < docs.length; i += 400) {
      const lote = db.batch()
      docs.slice(i, i + 400).forEach(d => lote.delete(d.ref))
      await lote.commit()
    }
  }
  console.log(confirmar ? `Listo: ${total} documentos de prueba borrados.` : `Simulacro: se borrarían ${total}. Para borrar de verdad: npm run limpiar:pruebas -- --confirmar`)
}
main().then(() => process.exit(0), e => { console.error('Error:', e.message); process.exit(1) })
