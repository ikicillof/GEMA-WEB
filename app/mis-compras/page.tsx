'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

export default function MisComprasPage() {
  const { sesion, cargando, abrirLogin } = useAuth()
  return <section className="page-hero"><div className="shell">
    <p className="eyebrow">Tu cuenta</p>
    <h1 className="page-title">Mis compras</h1>
    {cargando ? <p className="page-hero-copy">Un momento…</p>
      : !sesion ? <><p className="page-hero-copy">Ingresá para ver tus pedidos.</p><button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar')}>Ingresar</button></>
      : <><p className="page-hero-copy">Todavía no tenés compras. Cuando hagas tu primer pedido lo vas a ver acá.</p><Link href="/tienda" className="button button--dark">Ir a la tienda</Link></>}
  </div></section>
}
