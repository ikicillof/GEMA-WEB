// Prueba de lectura con Admin SDK (no escribe). Uso: npm run test:firebase-admin
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
})
const cols = await getFirestore(app).listCollections()
console.log('Admin SDK OK. Colecciones:', cols.map(c => c.id))
process.exit(0)
