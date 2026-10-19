import Image from 'next/image'
import { ESTADO_TEXTO, type PedidoPublico } from '@/lib/pedidos'
import { formatPrice } from '@/lib/products'

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Una compra: estado, productos, envío y total. Lo usan "Mis compras" y la confirmación al volver del pago. */
export function PedidoDetalle({ pedido }: { pedido: PedidoPublico }) {
  const e = pedido.entrega
  return <article className="checkout-card pedido">
    <header className="pedido-head">
      <div><b>Compra del {fecha(pedido.creadoEn)}</b><small>N.º {pedido.id}</small></div>
      <span className={`pedido-estado pedido-estado--${pedido.estado}`}>{ESTADO_TEXTO[pedido.estado]}</span>
    </header>
    {pedido.modoPrueba && <p className="checkout-sim">Compra de prueba.</p>}
    <div className="summary-lines">
      {pedido.lineas.map(l => <div key={l.id} className="summary-line">
        <div className="summary-img">{l.image && <Image src={l.image} alt="" fill unoptimized sizes="56px" />}</div>
        <div><b>{l.name}</b><small>{l.color} · x{l.quantity}</small></div>
        <strong>{formatPrice(l.price * l.quantity)}</strong>
      </div>)}
    </div>
    <dl className="summary-totals">
      <div><dt>Productos</dt><dd>{formatPrice(pedido.subtotal)}</dd></div>
      {pedido.descuento > 0 && <div><dt>Descuento por transferencia</dt><dd>- {formatPrice(pedido.descuento)}</dd></div>}
      <div><dt>Envío{pedido.envio ? ` (${pedido.envio.modalidad === 'domicilio' ? 'a domicilio' : 'a sucursal'})` : ''}</dt><dd>{pedido.envio ? formatPrice(pedido.envio.precio) : '—'}</dd></div>
      <div className="pedido-total"><dt>Total</dt><dd>{formatPrice(pedido.total)}</dd></div>
    </dl>
    <p className="checkout-hint">
      {pedido.envio?.sucursal
        ? `Retirás en ${pedido.envio.sucursal.nombre} (${pedido.envio.sucursal.direccion}).`
        : `Entrega en ${e.calle} ${e.numero}${e.piso ? `, ${e.piso}` : ''}, ${e.localidad} (CP ${e.cp}).`}
    </p>
  </article>
}
