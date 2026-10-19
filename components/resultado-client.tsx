'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { PedidoPublico } from '@/lib/pedidos'
import { WHATSAPP_NUMERO } from '@/lib/envio'
import { Check, Copy } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useAuth } from './auth-provider'
import { useCart } from './cart-context'
import { PedidoDetalle } from './pedido-detalle'

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
  const titulo = !pedido ? 'Un momento…'
    : pedido.estado === 'pagado' || pedido.estado === 'completado' ? '¡Recibimos tu pago!'
    : pedido.estado === 'transferencia_en_proceso' ? 'Falta tu transferencia'
    : pedido.estado === 'cancelado' || fallo ? 'El pago no se completó' : 'Estamos confirmando tu pago'

  return <section className="checkout">
    <div className="shell">
      <p className="eyebrow">Tu compra</p>
      <h1 className="page-title checkout-title">{titulo}</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {pedido && <div className="checkout-main">
        {pedido.estado === 'pendiente_pago' && <div className="checkout-card" role="status">
          <p className="checkout-hint">{fallo
            ? 'No se acreditó el pago. Tu carrito sigue como estaba, podés volver a intentarlo.'
            : 'Mercado Pago todavía no nos confirmó el pago. Esta página se actualiza sola; si ya pagaste, puede demorar unos minutos.'}</p>
          <Link href="/checkout" className="button button--pink">Volver al checkout</Link>
        </div>}
        {pedido.estado === 'transferencia_en_proceso' && <Transferencia pedido={pedido} />}
        <PedidoDetalle pedido={pedido} />
        <Link href="/mis-compras" className="button button--dark">Ver mis compras</Link>
      </div>}
    </div>
  </section>
}

/** Cuánto transferir, a dónde (alias con botón para copiar) y el comprobante por WhatsApp con el mensaje ya armado. */
function Transferencia({ pedido }: { pedido: PedidoPublico }) {
  const [copiado, setCopiado] = useState(false)
  const datos = pedido.transferencia?.datos ?? null
  const numero = pedido.transferencia?.whatsapp || WHATSAPP_NUMERO
  const productos = pedido.lineas.map(l => `${l.name} (${l.color}) x${l.quantity}`).join(', ')
  const mensaje = `Hola Gemma, soy ${pedido.entrega.nombre}. Te envío el comprobante de la transferencia del pedido ${pedido.id}.
Productos: ${productos}
Total: ${formatPrice(pedido.total)}`
  const copiar = async () => {
    if (!datos) return
    try { await navigator.clipboard.writeText(datos.alias); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* el alias queda a la vista para copiarlo a mano */ }
  }
  return <div className="checkout-card">
    <h2>Cómo pagar</h2>
    <p className="checkout-hint">Transferí <b>{formatPrice(pedido.total)}</b>{pedido.descuento > 0 ? ` (ya con el descuento por transferencia de ${formatPrice(pedido.descuento)})` : ''} e indicá el número de compra {pedido.id}.</p>
    {datos ? <dl className="summary-totals">
      <div><dt>Alias</dt><dd><b>{datos.alias}</b> <button type="button" className="button button--dark" onClick={copiar} aria-live="polite">{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar alias</>}</button></dd></div>
      {datos.titular && <div><dt>Titular</dt><dd>{datos.titular}</dd></div>}
      {datos.banco && <div><dt>Banco</dt><dd>{datos.banco}</dd></div>}
    </dl> : <p className="checkout-hint">Te pasamos los datos para transferir por WhatsApp. Escribinos y coordinamos.</p>}
    {datos?.provisorio && <p className="checkout-sim">Datos de ejemplo: todavía no transfieras a este alias.</p>}
    <a className="button button--dark" href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
  </div>
}
