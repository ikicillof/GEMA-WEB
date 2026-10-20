// Lista las ventas con mails sin enviar (mailsPendientes) y, con --confirmar, los reintenta.
// Por defecto solo toca ventas de PRUEBA (modoPrueba); con --todas también las reales.
// Sin --confirmar es un simulacro: no manda ningún mail.
// Uso: npx tsx --conditions=react-server --tsconfig scripts/tsconfig.mails.json --env-file=.env.local scripts/mails-reintentar.mts [--confirmar] [--todas]
import { adminDb } from '../lib/firebase/admin'
import { reintentarMailsFallidos } from '../lib/server/emails'

const confirmar = process.argv.includes('--confirmar')
const todas = process.argv.includes('--todas')
const ocultar = (email: unknown) => { const e = String(email ?? ''); const [u, d] = e.split('@'); return d ? `${u.slice(0, 1)}***@${d}` : '(sin email)' }

const snap = await adminDb().collection('orders').where('mailsPendientes', '==', true).get()
console.log(`${snap.size} venta(s) con mails sin enviar${confirmar ? '' : ' (simulacro: no se manda nada)'}`)

for (const doc of snap.docs) {
  const d = doc.data()
  const emails = (d.emails ?? {}) as Record<string, { estado?: string; intentos?: number; error?: string }>
  const fallidos = Object.entries(emails).filter(([, m]) => m.estado === 'error')
  console.log(`\n${doc.id}  [${d.modoPrueba === true ? 'PRUEBA' : 'REAL'}]  estado=${d.estado}  cliente=${ocultar(d.datosEnvio?.email ?? d.email)}`)
  for (const [tipo, m] of fallidos) console.log(`  - ${tipo}: ${m.intentos ?? 0} intento(s), error: ${String(m.error ?? '').slice(0, 140)}`)
  if (d.modoPrueba !== true && !todas) { console.log('  (venta real: se omite; usá --todas para incluirla)'); continue }
  if (!confirmar) continue
  const r = await reintentarMailsFallidos(doc.id)
  console.log(`  → reintentados ${r.reintentados}, siguen fallando ${r.siguenFallando}`)
}
