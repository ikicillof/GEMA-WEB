// Prueba de punta a punta de login, roles y reglas de Firestore contra un servidor Next ya levantado.
// Crea cuentas de prueba con el Admin SDK y las borra al final.
// El servidor tiene que arrancar con CREATOR_EMAIL igual al email de creador de prueba:
//   CREATOR_EMAIL=creador@gemma-test.invalid npm run dev
// y en otra terminal:
//   node --env-file=.env.local scripts/test-auth-flow.mjs http://localhost:3000 creador@gemma-test.invalid
import { initializeApp as initAdmin, cert } from 'firebase-admin/app'
import { getAuth as adminAuth } from 'firebase-admin/auth'
import { getFirestore as adminDb } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'

const base = process.argv[2] || 'http://localhost:3000'
const emailCreador = process.argv[3]
if (!emailCreador) throw new Error('Falta el email de creador de prueba (2do argumento)')
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

initAdmin({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) })
const A = adminAuth(), D = adminDb()
const sufijo = Date.now().toString(36)
const creados = []
let ok = 0, fallos = 0
const check = (nombre, cond, extra = '') => { cond ? ok++ : fallos++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${nombre}${cond ? '' : '  ' + extra}`) }

async function crear(etiqueta, { email, verificado = true } = {}) {
  const u = await A.createUser({ email: email ?? `${etiqueta}-${sufijo}@gemma-test.invalid`, emailVerified: verificado, password: 'Prueba-' + sufijo + '!', displayName: 'Test ' + etiqueta })
  creados.push(u.uid)
  return u
}
async function idToken(uid) {
  const custom = await A.createCustomToken(uid)
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: custom, returnSecureToken: true }) })
  return (await r.json()).idToken
}
const llamar = async (ruta, token, cuerpo) => {
  const r = await fetch(base + ruta, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
const claims = async uid => (await A.getUser(uid)).customClaims ?? {}

try {
  console.log('--- Sync / perfil')
  check('sync sin token -> 401', (await llamar('/api/auth/sync')).status === 401)
  check('sync con token falso -> 401', (await llamar('/api/auth/sync', 'abc.def.ghi')).status === 401)

  const cli = await crear('cliente')
  const t = await idToken(cli.uid)
  check('sync rechaza campos extra (rol) -> 400', (await llamar('/api/auth/sync', t, { rol: 'admin' })).status === 400)
  let r = await llamar('/api/auth/sync', t, { nombre: 'Test Cliente', recibeNovedades: true })
  check('sync crea cliente', r.status === 200 && r.body.rol === 'cliente', JSON.stringify(r))
  const perfil = (await D.doc('users/' + cli.uid).get()).data()
  check('perfil: nombre, email, rol, recibeNovedades, fechaAlta', perfil?.nombre === 'Test Cliente' && perfil.rol === 'cliente' && perfil.recibeNovedades === true && !!perfil.fechaAlta && perfil.email === cli.email, JSON.stringify(perfil))
  check('claim rol=cliente', (await claims(cli.uid)).rol === 'cliente')
  await llamar('/api/auth/sync', t, { nombre: 'Otro', recibeNovedades: false })
  check('segundo sync no pisa nombre ni novedades', (await D.doc('users/' + cli.uid).get()).data().nombre === 'Test Cliente')

  console.log('--- Creador por email (solo con email verificado)')
  const cre = await crear('creador', { email: emailCreador, verificado: false })
  r = await llamar('/api/auth/sync', await idToken(cre.uid), { nombre: 'Creador Test' })
  check('email de creador SIN verificar -> cliente', r.body.rol === 'cliente', JSON.stringify(r))
  await A.updateUser(cre.uid, { emailVerified: true })
  r = await llamar('/api/auth/sync', await idToken(cre.uid))
  check('email de creador verificado -> creador', r.body.rol === 'creador', JSON.stringify(r))
  check('claim rol=creador', (await claims(cre.uid)).rol === 'creador')
  const tCre = await idToken(cre.uid)

  console.log('--- Roles')
  const c2 = await crear('colab'), ad = await crear('admin'), v = await crear('victima')
  for (const u of [c2, ad, v]) await llamar('/api/auth/sync', await idToken(u.uid), { nombre: u.displayName })
  check('cliente no puede asignar roles -> 403', (await llamar('/api/admin/roles', t, { uid: c2.uid, rol: 'admin' })).status === 403)
  check('rol "creador" no se puede asignar -> 400', (await llamar('/api/admin/roles', tCre, { uid: c2.uid, rol: 'creador' })).status === 400)
  check('creador no cambia su propio rol -> 403', (await llamar('/api/admin/roles', tCre, { uid: cre.uid, rol: 'admin' })).status === 403)
  r = await llamar('/api/admin/roles', tCre, { uid: c2.uid, rol: 'colaborador' })
  check('creador hace colaborador (permisos por defecto)', r.status === 200 && (await claims(c2.uid)).rol === 'colaborador' && (await claims(c2.uid)).permisos?.length === 2, JSON.stringify(r))
  await llamar('/api/admin/roles', tCre, { uid: c2.uid, rol: 'colaborador', permisos: ['ventas:ver', 'hackear:todo'] })
  check('permisos fuera de la lista se descartan', JSON.stringify((await claims(c2.uid)).permisos) === '["ventas:ver"]', JSON.stringify(await claims(c2.uid)))
  r = await llamar('/api/admin/roles', tCre, { uid: ad.uid, rol: 'admin' })
  check('creador hace admin', r.status === 200 && (await claims(ad.uid)).rol === 'admin', JSON.stringify(r))
  const tAd = await idToken(ad.uid)
  check('colaborador no asigna roles -> 403', (await llamar('/api/admin/roles', await idToken(c2.uid), { uid: v.uid, rol: 'colaborador' })).status === 403)
  check('admin hace colaborador a un cliente', (await llamar('/api/admin/roles', tAd, { uid: v.uid, rol: 'colaborador' })).status === 200)
  check('admin NO puede crear otro admin -> 403', (await llamar('/api/admin/roles', tAd, { uid: v.uid, rol: 'admin' })).status === 403)
  check('admin NO toca al creador -> 403', (await llamar('/api/admin/roles', tAd, { uid: cre.uid, rol: 'cliente' })).status === 403)
  const ad2 = await crear('admin2')
  await llamar('/api/auth/sync', await idToken(ad2.uid))
  await llamar('/api/admin/roles', tCre, { uid: ad2.uid, rol: 'admin' })
  check('admin NO toca a otro admin -> 403', (await llamar('/api/admin/roles', tAd, { uid: ad2.uid, rol: 'cliente' })).status === 403)
  check('admin no cambia su propio rol -> 403', (await llamar('/api/admin/roles', tAd, { uid: ad.uid, rol: 'cliente' })).status === 403)
  check('uid inexistente -> 404', (await llamar('/api/admin/roles', tCre, { uid: 'no-existe-123', rol: 'cliente' })).status === 404)
  check('cambios quedan en auditoria', (await D.collection('auditoria').where('porUid', '==', cre.uid).get()).size >= 3)
  r = await llamar('/api/admin/roles', tCre, { uid: ad.uid, rol: 'cliente' })
  check('creador quita admin', r.status === 200 && (await claims(ad.uid)).rol === 'cliente')
  check('token viejo del admin degradado deja de valer -> 401', (await llamar('/api/admin/roles', tAd, { uid: v.uid, rol: 'cliente' })).status === 401)

  console.log('--- Reglas de Firestore (cliente)')
  const app = initializeApp({ apiKey, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID }, 'reglas')
  await signInWithCustomToken(getAuth(app), await A.createCustomToken(cli.uid))
  const fs = getFirestore(app)
  const intenta = async fn => { try { await fn(); return 'permitido' } catch (e) { return e.code } }
  check('lee su propio perfil', await intenta(() => getDoc(doc(fs, 'users', cli.uid))) === 'permitido')
  check('NO lee el perfil de otro', await intenta(() => getDoc(doc(fs, 'users', ad.uid))) === 'permission-denied')
  check('NO puede cambiarse el rol', await intenta(() => updateDoc(doc(fs, 'users', cli.uid), { rol: 'admin' })) === 'permission-denied')
  check('NO puede cambiarse el email', await intenta(() => updateDoc(doc(fs, 'users', cli.uid), { email: 'x@x.com' })) === 'permission-denied')
  check('NO acepta recibeNovedades que no sea booleano', await intenta(() => updateDoc(doc(fs, 'users', cli.uid), { recibeNovedades: 'si' })) === 'permission-denied')
  check('puede cambiar nombre y recibeNovedades', await intenta(() => updateDoc(doc(fs, 'users', cli.uid), { nombre: 'Nuevo Nombre', recibeNovedades: false })) === 'permitido')
  check('NO crea documentos de usuario', await intenta(() => setDoc(doc(fs, 'users', 'inventado'), { nombre: 'x', rol: 'admin' })) === 'permission-denied')
  check('NO lee configuracion', await intenta(() => getDoc(doc(fs, 'configuracion', 'general'))) === 'permission-denied')
  check('NO lee auditoria', await intenta(() => getDoc(doc(fs, 'auditoria', 'x'))) === 'permission-denied')
} catch (e) {
  fallos++
  console.log('ERROR inesperado:', e.message)
} finally {
  const audit = await D.collection('auditoria').where('porUid', 'in', creados.slice(0, 30)).get().catch(() => ({ docs: [] }))
  await Promise.all(audit.docs.map(d => d.ref.delete()))
  await Promise.all(creados.map(uid => D.doc('users/' + uid).delete().catch(() => {})))
  if (creados.length) await A.deleteUsers(creados)
  console.log(`\nLimpieza: ${creados.length} cuentas de prueba borradas.`)
  console.log(`Resultado: ${ok} OK, ${fallos} con fallas`)
  process.exit(fallos ? 1 : 0)
}
