// Vincula modelos 3D (public/modelos/*.glb) con productos de Firestore, con el Admin SDK.
// Uso: npm run vincular:modelos   (idempotente; solo toca el campo modelo3d de productos que existen)
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const modelos: Record<string, string> = {
  'perro-globo': '/modelos/perro-globo.glb',
}

const db = getFirestore(initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
}))

async function main() {
  for (const slug of Object.keys(modelos)) {
    const ruta = modelos[slug]
    if (!existsSync(join(process.cwd(), 'public', ruta))) throw new Error(`No existe public${ruta}`)
    const ref = db.collection('products').doc(slug)
    if (!(await ref.get()).exists) throw new Error(`No existe el producto ${slug}`)
    await ref.update({ modelo3d: ruta })
    console.log('vinculado', slug, '->', (await ref.get()).data()?.modelo3d)
  }
}
main().then(() => process.exit(0), e => { console.error(e.message); process.exit(1) })
