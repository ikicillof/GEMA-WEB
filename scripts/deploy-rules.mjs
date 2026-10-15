// Publica firestore.rules (del repo) con el Admin SDK. Alternativa a `firebase deploy` sin login interactivo.
// Uso: npm run deploy:rules
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getSecurityRules } from 'firebase-admin/security-rules'

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
})
const fuente = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
const ruleset = await getSecurityRules(app).releaseFirestoreRulesetFromSource(fuente)
console.log('Reglas publicadas. Ruleset:', ruleset.name)
process.exit(0)
