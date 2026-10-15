'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { colorHex } from '@/lib/products'
import { FlyToCart, type Flight } from './fly-to-cart'
import { useAuth } from './auth-provider'

let flightKey = 0
export type CartItem = { id: string; slug: string; name: string; price: number; image: string; color: string; quantity: number }
type CartContextValue = { items: CartItem[]; isOpen: boolean; setIsOpen: (open: boolean) => void; addItem: (item: Omit<CartItem, 'id' | 'quantity'>, quantity?: number, origin?: Element | null) => void; removeItem: (id: string) => void; updateQuantity: (id: string, quantity: number) => void; clearCart: () => void; total: number; itemCount: number; cartPulse: number }
const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [cartPulse, setCartPulse] = useState(0)
  useEffect(() => { try { const stored = window.localStorage.getItem('gemma-cart'); if (stored) setItems(JSON.parse(stored)) } catch {} setHydrated(true) }, [])
  useEffect(() => { if (hydrated) window.localStorage.setItem('gemma-cart', JSON.stringify(items)) }, [items, hydrated])

  // Carrito en la cuenta: al iniciar sesión se une con el de este navegador; después cada cambio se guarda en el servidor.
  const { sesion, llamar } = useAuth()
  const uid = sesion?.user.uid ?? null
  const fusionadoPara = useRef<string | null>(null) // uid cuyo carrito ya se unió en esta sesión de la página
  const ultimoGuardado = useRef('')
  const itemsRef = useRef(items)
  itemsRef.current = items
  const clave = (lista: CartItem[]) => JSON.stringify(lista.map(i => [i.slug, i.color, i.quantity]))
  useEffect(() => {
    if (!hydrated) return
    if (!uid) { if (fusionadoPara.current) { fusionadoPara.current = null; ultimoGuardado.current = ''; setItems([]) } return } // cerró sesión: no deja el carrito en un equipo compartido
    if (fusionadoPara.current === uid) return
    let cancelado = false
    ;(async () => {
      try {
        const local = itemsRef.current.map(i => ({ slug: i.slug, color: i.color, cantidad: i.quantity }))
        const res = await llamar('/api/carrito', { method: 'PUT', body: JSON.stringify({ modo: 'fusionar', items: local }) })
        if (!res.ok || cancelado) return
        const { items: servidor } = (await res.json()) as { items: CartItem[] }
        fusionadoPara.current = uid
        ultimoGuardado.current = clave(servidor)
        setItems(servidor)
      } catch { /* sin conexión: el carrito sigue en este navegador y se reintenta en la próxima carga */ }
    })()
    return () => { cancelado = true }
  }, [uid, hydrated, llamar])
  useEffect(() => {
    if (!uid || fusionadoPara.current !== uid || clave(items) === ultimoGuardado.current) return
    const t = setTimeout(async () => {
      try {
        const res = await llamar('/api/carrito', { method: 'PUT', body: JSON.stringify({ modo: 'reemplazar', items: items.map(i => ({ slug: i.slug, color: i.color, cantidad: i.quantity })) }) })
        if (res.ok) ultimoGuardado.current = clave(items)
      } catch { /* se vuelve a intentar con el próximo cambio */ }
    }, 700)
    return () => clearTimeout(t)
  }, [items, uid, llamar])
  const [flights, setFlights] = useState<Flight[]>([])
  const addItem = useCallback<CartContextValue['addItem']>((item, quantity = 1, origin) => {
    // El carrito (contador, rebote del ícono, saltito de Gemi, cajón) reacciona al ATERRIZAR la foto; sin vuelo, al instante.
    const commit = () => { setItems(current => { const id = `${item.slug}-${item.color}`; const existing = current.find(line => line.id === id); return existing ? current.map(line => line.id === id ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { ...item, id, quantity }] }); setCartPulse(pulse => pulse + 1); setIsOpen(true) }
    const target = document.querySelector('.cart-button')
    if (!origin || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { commit(); return }
    setFlights(current => [...current, { key: ++flightKey, from: origin.getBoundingClientRect(), to: target.getBoundingClientRect(), image: item.image, tone: colorHex(item.color), commit }])
  }, [])
  const value = useMemo<CartContextValue>(() => ({ items, isOpen, setIsOpen, addItem, removeItem: id => setItems(current => current.filter(line => line.id !== id)), updateQuantity: (id, quantity) => setItems(current => quantity <= 0 ? current.filter(line => line.id !== id) : current.map(line => line.id === id ? { ...line, quantity } : line)), clearCart: () => setItems([]), total: items.reduce((sum, line) => sum + line.price * line.quantity, 0), itemCount: items.reduce((sum, line) => sum + line.quantity, 0), cartPulse }), [items, isOpen, hydrated, cartPulse])
  return <CartContext.Provider value={value}>{children}{flights.map(flight => <FlyToCart key={flight.key} flight={flight} onDone={() => setFlights(current => current.filter(f => f.key !== flight.key))} />)}</CartContext.Provider>
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('useCart debe usarse dentro de CartProvider'); return context }
