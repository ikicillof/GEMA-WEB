// Migración de una sola vez: carga el catálogo local en Firestore (colección products/{slug}) con el Admin SDK.
// Uso:  npm run migrar:catalogo            -> crea los que faltan, no pisa nada de lo que ya exista
//       npm run migrar:catalogo -- --forzar -> reescribe TODO (pisa cambios hechos desde el panel)
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { catalogoInicial } from '../lib/catalogo-inicial'

// VALORES PROVISORIOS (estimados, no medidos). La dueña los tiene que reemplazar por los reales
// pesando y midiendo cada pieza ya embalada: se usan para cotizar el envío.
const logistica: Record<string, { categoria: string; pesoGramos: number; altoCm: number; anchoCm: number; largoCm: number }> = {
  'calendario-perpetuo':      { categoria: 'Calendarios', pesoGramos: 450, altoCm: 15, anchoCm: 20, largoCm: 8 },
  'calendario-perpetuo-flip': { categoria: 'Calendarios', pesoGramos: 500, altoCm: 12, anchoCm: 18, largoCm: 10 },
  'estante-goteo':            { categoria: 'Estantes', pesoGramos: 350, altoCm: 8, anchoCm: 30, largoCm: 12 },
  'perro-globo':              { categoria: 'Figuras', pesoGramos: 250, altoCm: 20, anchoCm: 15, largoCm: 12 },
  'lampara-diamante':         { categoria: 'Lámparas', pesoGramos: 600, altoCm: 25, anchoCm: 20, largoCm: 20 },
  'lampara-emilia':           { categoria: 'Lámparas', pesoGramos: 450, altoCm: 22, anchoCm: 14, largoCm: 14 },
  'gusano-worms':             { categoria: 'Figuras', pesoGramos: 700, altoCm: 12, anchoCm: 26, largoCm: 10 },
  'lampara-lumalee':          { categoria: 'Lámparas', pesoGramos: 400, altoCm: 20, anchoCm: 20, largoCm: 10 },
  'portallaves-ondas':        { categoria: 'Organización', pesoGramos: 200, altoCm: 10, anchoCm: 25, largoCm: 4 },
  'reloj-tamagotchi':         { categoria: 'Relojes', pesoGramos: 400, altoCm: 25, anchoCm: 20, largoCm: 4 },
  'soporte-notebook':         { categoria: 'Escritorio', pesoGramos: 800, altoCm: 12, anchoCm: 30, largoCm: 25 },
}

const forzar = process.argv.includes('--forzar')
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  }),
})
const db = getFirestore(app)

async function main() {
  let creados = 0, existentes = 0
  for (let i = 0; i < catalogoInicial.length; i++) {
    const p = catalogoInicial[i]
    const extra = logistica[p.slug]
    if (!extra) throw new Error(`Falta peso y medidas provisorias para ${p.slug}`)
    const { slug, ...campos } = p
    const datos = {
      ...campos,
      featured: p.featured === true,
      categoria: extra.categoria,
      modelo3d: null, // se completa desde el panel; hoy los modelos 3D no están vinculados a productos
      activo: true,
      pesoGramos: extra.pesoGramos,
      altoCm: extra.altoCm,
      anchoCm: extra.anchoCm,
      largoCm: extra.largoCm,
      medidasProvisorias: true, // el panel la apaga cuando la dueña carga los valores reales
      orden: (i + 1) * 10,
      actualizadoEn: FieldValue.serverTimestamp(),
    }
    const ref = db.collection('products').doc(slug)
    if (forzar) { await ref.set(datos); creados++; console.log('escrito  ', slug); continue }
    try { await ref.create(datos); creados++; console.log('creado   ', slug) }
    catch (e) { if ((e as { code?: number }).code !== 6) throw e; existentes++; console.log('ya existe', slug, '(no se toca)') }
  }
  console.log(`\nListo: ${creados} escritos, ${existentes} ya existían.`)
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
