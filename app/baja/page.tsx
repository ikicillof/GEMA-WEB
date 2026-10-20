import type { Metadata } from 'next'
import Link from 'next/link'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { verificarBaja } from '@/lib/server/novedades-token'
import { DeshacerBaja } from './deshacer-baja'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Darme de baja', robots: { index: false, follow: false } }

/**
 * Link «Darme de baja» de los mails. Sin login: el token firmado de la dirección identifica a la persona.
 * Al abrirlo, queda dada de baja (recibeNovedades en false, escrito desde el servidor) y se le muestra la confirmación,
 * con la opción de arrepentirse. Un token falso o adulterado no hace nada y no revela si existe la cuenta.
 */
export default async function BajaPage({ searchParams }: { searchParams: { t?: string | string[] } }) {
  const token = typeof searchParams.t === 'string' ? searchParams.t : ''
  let estado: 'ok' | 'invalido' | 'error' = 'invalido'
  if (token) {
    try {
      const uid = verificarBaja(token)
      if (uid) {
        const ref = adminDb().collection('users').doc(uid)
        if ((await ref.get()).exists) {
          await ref.update({ recibeNovedades: false, novedadesPreguntadas: true, novedadesBajaEn: FieldValue.serverTimestamp() })
          estado = 'ok'
        }
      }
    } catch (e) {
      console.error('[baja]', (e as Error).message)
      estado = 'error'
    }
  }

  return <section className="page-hero"><div className="shell">
    <p className="eyebrow">Novedades de Gemma</p>
    {estado === 'ok' && <>
      <h1 className="page-title baja-titulo">Listo, te diste de baja</h1>
      <p className="page-hero-copy">No vas a recibir más novedades por email. Si te equivocaste, podés volver cuando quieras.</p>
      <div className="novedades-baja-acciones"><DeshacerBaja token={token} /><Link href="/tienda" className="button button--pink">Ir a la tienda</Link></div>
    </>}
    {estado === 'invalido' && <>
      <h1 className="page-title baja-titulo">Este link no sirve</h1>
      <p className="page-hero-copy">El link está incompleto o ya no es válido. Si querés cambiar tus novedades, ingresá y andá a «Mi cuenta».</p>
      <Link href="/mi-cuenta" className="button button--pink">Ir a Mi cuenta</Link>
    </>}
    {estado === 'error' && <>
      <h1 className="page-title baja-titulo">No pudimos darte de baja</h1>
      <p className="page-hero-copy" role="alert">Algo salió mal de nuestro lado. Probá de nuevo en un momento o cambialo en «Mi cuenta».</p>
      <Link href="/mi-cuenta" className="button button--pink">Ir a Mi cuenta</Link>
    </>}
  </div></section>
}
