'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Minus, Plus, Trash2, X } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { AnimatedPrice } from './animated-price'
import { useCart } from './cart-context'
import { useAuth } from './auth-provider'

export function CartDrawer() {
  const router = useRouter()
  const { sesion, abrirLogin } = useAuth()
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, total, itemCount } = useCart()
  // Sin sesión se abre el login y, al ingresar, sigue solo al checkout con el carrito intacto.
  const finalizar = () => {
    setIsOpen(false)
    if (sesion) router.push('/checkout')
    else abrirLogin('ingresar', '/checkout')
  }
  return <>
    {isOpen && <button type="button" className="drawer-backdrop" aria-label="Cerrar carrito" onClick={() => setIsOpen(false)} />}
    <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`} aria-label="Carrito de compra" aria-hidden={!isOpen}>
      <div className="flex items-start justify-between border-b border-black/10 pb-5"><div><p className="eyebrow">Tu selección</p><h2 className="drawer-title">Carrito <span>{itemCount}</span></h2></div><button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Cerrar carrito"><X size={20} /></button></div>
      <div className="drawer-items">
        {items.length === 0 ? <div className="empty-cart"><h3>Tu rincón está esperando</h3><p>Sumá algo con color y vemos cómo queda.</p><button type="button" className="button button--dark" onClick={() => setIsOpen(false)}>Seguir mirando <ArrowRight size={16} /></button></div> : items.map(item => <div key={item.id} className="cart-line"><div className="cart-line-image"><Image src={item.image} alt={item.name} fill unoptimized sizes="72px" /></div><div className="min-w-0 flex-1"><p className="cart-line-name">{item.name}</p><p className="cart-line-meta">{item.color} · {formatPrice(item.price)}</p><div className="quantity-control"><button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Restar"><Minus size={13} /></button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Sumar"><Plus size={13} /></button></div></div><div className="flex flex-col items-end justify-between self-stretch"><strong><AnimatedPrice value={item.price * item.quantity} /></strong><button type="button" className="remove-button" onClick={() => removeItem(item.id)} aria-label={`Quitar ${item.name}`}><Trash2 size={15} /></button></div></div>)}
      </div>
      <div className="drawer-footer"><div className="flex items-center justify-between"><span>Total</span><strong><AnimatedPrice value={total} /></strong></div><button type="button" className="button button--pink checkout-button" disabled={items.length === 0} onClick={finalizar}>Finalizar compra <ArrowRight size={16} /></button><p className="drawer-note">{sesion ? 'Elegís el envío y ves el total en el próximo paso.' : 'Para pagar te pedimos ingresar o crear tu cuenta; tu carrito queda como está.'}</p></div>
    </aside>
  </>
}
