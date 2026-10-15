import 'server-only'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Solo servidor. Las credenciales salen de variables de entorno que nunca llevan NEXT_PUBLIC_.
function app() {
  const existente = getApps()[0]
  if (existente) return existente
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Faltan variables de Firebase Admin en el servidor')
  }
  return initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // En el .env los saltos de línea van escritos como \n
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminAuth = () => getAuth(app())
export const adminDb = () => getFirestore(app())
