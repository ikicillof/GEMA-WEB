// Prueba de lectura desde el cliente (no escribe). Uso: npm run test:firebase-client
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
try {
  const snap = await getDocs(query(collection(getFirestore(app), 'productos'), limit(1)))
  console.log('Cliente OK. Docs leídos:', snap.size)
} catch (e) {
  console.log('Cliente falló:', e.code, '-', e.message)
}
process.exit(0)
