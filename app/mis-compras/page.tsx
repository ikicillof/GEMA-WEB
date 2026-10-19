'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { CargaGemma } from '@/components/carga-gemma'
import { PedidoDetalle } from '@/components/pedido-detalle'
import type { PedidoPublico } from '@/lib/pedidos'

export default function MisComprasPage() {
  const { sesion, cargando, abrirLogin, llamar } = useAuth()
  const uid = sesion?.user.uid
  const [lista, setLista] = useState<PedidoPublico[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) { setLista(null); return }
    let cancelado = false
    llamar('/api/pedidos').then(async r => {
      const cuerpo = await r.json().catch(() => ({}))
      if (cancelado) return
      if (r.ok) setLista(cuerpo.pedidos); else setError(cuerpo.error || 'No pudimos cargar tus compras.')
    }).catch(() => { if (!cancelado) setError('No pudimos cargar tus compras. Revisá tu conexión.') })
    return () => { cancelado = true }
  }, [uid, llamar])

  const esperando = cargando || (!!sesion && !lista && !error)
  if (esperando) return <CargaGemma mensaje="Buscando tus compras…" />

  if (sesion && lista?.length) {
    return <section className="checkout"><div className="shell">
      <p className="eyebrow">Tu cuenta</p>
      <h1 className="page-title checkout-title">Mis compras</h1>
      <div className="checkout-main">{lista.map(p => <PedidoDetalle key={p.id} pedido={p} />)}</div>
    </div></section>
  }

  return <section className="page-hero"><div className="shell">
    <p className="eyebrow">Tu cuenta</p>
    <h1 className="page-title">Mis compras</h1>
    {!sesion ? <><p className="page-hero-copy">Ingresá para ver tus pedidos.</p><button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar')}>Ingresar</button></>
      : error ? <p className="page-hero-copy" role="alert">{error}</p>
      : <><p className="page-hero-copy">Todavía no tenés compras. Cuando hagas tu primer pedido lo vas a ver acá.</p><Link href="/tienda" className="button button--pink">Ir a la tienda</Link></>}
  </div></section>
}
