'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { PedidoPublico } from '@/lib/pedidos'
import { useAuth } from './auth-provider'
import { useCart } from './cart-context'
import { CargaGemma } from './carga-gemma'
import { PedidoDetalle } from './pedido-detalle'
import { TransferenciaCard } from './transferencia-card'

const REINTENTOS = 8 // se consulta hasta ~40 s mientras el pago no figure confirmado

/** Pantalla a la que vuelve la persona desde Mercado Pago (o tras elegir transferencia). El estado real sale del servidor. */
export function ResultadoClient() {
  const params = useSearchParams()
  const id = params.get('pedido') ?? ''
  const { sesion, cargando, abrirLogin, llamar } = useAuth()
  const { clearCart } = useCart()
  const [pedido, setPedido] = useState<PedidoPublico | null>(null)
  const [error, setError] = useState<string | null>(null)
  const vacio = useRef(false)
  const pidioLogin = useRef(false)

  useEffect(() => {
    if (cargando || sesion || pidioLogin.current) return
    pidioLogin.current = true
    abrirLogin('ingresar', `/checkout/resultado?pedido=${encodeURIComponent(id)}`)
  }, [cargando, sesion, abrirLogin, id])

  const uid = sesion?.user.uid
  useEffect(() => {
    if (!uid) return
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) { setError('No encontramos ese pedido.'); return }
    let cancelado = false
    let intentos = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const consultar = async () => {
      try {
        const res = await llamar(`/api/pedidos/${id}`)
        const cuerpo = await res.json().catch(() => ({}))
        if (cancelado) return
        if (!res.ok) { setError(cuerpo.error || 'No pudimos cargar tu pedido.'); return }
        setPedido(cuerpo.pedido)
        const e = cuerpo.pedido.estado
        if ((e === 'pagado' || e === 'transferencia_en_proceso' || e === 'completado') && !vacio.current) { vacio.current = true; clearCart() }
        if (e === 'pendiente_pago' && ++intentos < REINTENTOS) timer = setTimeout(consultar, 5000)
      } catch {
        if (!cancelado) setError('No pudimos cargar tu pedido. Revisá tu conexión.')
      }
    }
    void consultar()
    return () => { cancelado = true; if (timer) clearTimeout(timer) }
  }, [uid, id, llamar, clearCart])

  const fallo = params.get('r') === 'error'
  const titulo = !pedido ? 'Tu compra'
    : pedido.estado === 'pagado' || pedido.estado === 'completado' ? '¡Recibimos tu pago!'
    : pedido.estado === 'transferencia_en_proceso' ? 'Falta tu transferencia'
    : pedido.estado === 'cancelado' || fallo ? 'El pago no se completó' : 'Estamos confirmando tu pago'

  if ((cargando || sesion) && !pedido && !error) return <CargaGemma mensaje="Revisando tu pago…" />

  return <section className="checkout">
    <div className="shell">
      <p className="eyebrow">Tu compra</p>
      <h1 className="page-title checkout-title">{titulo}</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {pedido && <div className="checkout-main">
        {pedido.estado === 'pendiente_pago' && <div className="checkout-card">
          {!fallo && <CargaGemma compacta mensaje="Confirmando tu pago…" />}
          <p className="checkout-hint">{fallo
            ? 'No se acreditó el pago. Tu carrito sigue como estaba, podés volver a intentarlo.'
            : 'Mercado Pago todavía no nos confirmó el pago. Esta página se actualiza sola; si ya pagaste, puede demorar unos minutos.'}</p>
          <Link href="/checkout" className="button button--pink">Volver al checkout</Link>
        </div>}
        {pedido.estado === 'transferencia_en_proceso' && <TransferenciaCard pedido={pedido} />}
        <PedidoDetalle pedido={pedido} />
        <Link href="/mis-compras" className="button button--dark">Ver mis compras</Link>
      </div>}
    </div>
  </section>
}
