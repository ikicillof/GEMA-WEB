'use client'

import { Check, Copy, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { WHATSAPP_NUMERO } from '@/lib/envio'
import type { PedidoPublico } from '@/lib/pedidos'
import { formatPrice } from '@/lib/products'

/** Cuánto transferir, a dónde (alias con botón para copiar) y el comprobante por WhatsApp con el mensaje ya armado. */
export function TransferenciaCard({ pedido }: { pedido: PedidoPublico }) {
  const [copiado, setCopiado] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])

  const datos = pedido.transferencia?.datos ?? null
  const numero = pedido.transferencia?.whatsapp || WHATSAPP_NUMERO
  const productos = pedido.lineas.map(l => `${l.name} (${l.color}) x${l.quantity}`).join(', ')
  const mensaje = `Hola Gemma, soy ${pedido.entrega.nombre}. Te envío el comprobante de la transferencia del pedido ${pedido.id}.\nProductos: ${productos}\nTotal: ${formatPrice(pedido.total)}`

  const copiar = async () => {
    if (!datos) return
    try {
      await navigator.clipboard.writeText(datos.alias)
      setCopiado(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiado(false), 2500)
    } catch { /* el alias queda a la vista para copiarlo a mano */ }
  }

  return <section className="checkout-card transfer" aria-labelledby="transfer-titulo">
    <h2 id="transfer-titulo">Cómo pagar</h2>

    <div className="transfer-total">
      <span>Total a transferir</span>
      <strong>{formatPrice(pedido.total)}</strong>
      {pedido.descuento > 0 && <small>Ya incluye el descuento por transferencia de {formatPrice(pedido.descuento)}</small>}
    </div>

    {datos ? <dl className="transfer-datos">
      <div className="transfer-fila">
        <dt>Alias</dt>
        <dd className="transfer-alias-fila">
          <span className="transfer-alias">{datos.alias}</span>
          <button type="button" className={`transfer-copiar ${copiado ? 'transfer-copiar--ok' : ''}`} onClick={copiar} aria-live="polite">
            {copiado ? <><Check size={16} aria-hidden="true" /> ¡Copiado!</> : <><Copy size={16} aria-hidden="true" /> Copiar alias</>}
          </button>
        </dd>
      </div>
      {datos.titular && <div className="transfer-fila"><dt>Titular</dt><dd>{datos.titular}</dd></div>}
      {datos.banco && <div className="transfer-fila"><dt>Banco</dt><dd>{datos.banco}</dd></div>}
    </dl> : <p className="checkout-hint">Te pasamos los datos para transferir por WhatsApp. Escribinos y coordinamos.</p>}

    {datos?.provisorio && <p className="transfer-aviso" role="note"><b>Datos de ejemplo.</b> Todavía no transfieras a este alias.</p>}

    <p className="transfer-ref">Indicá el número de compra <b>{pedido.id}</b> en el motivo de la transferencia.</p>

    <a className="button button--pink transfer-wa" href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={20} aria-hidden="true" /> Enviar comprobante por WhatsApp
    </a>
  </section>
}
