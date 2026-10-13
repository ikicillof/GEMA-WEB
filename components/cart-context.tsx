'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type CartItem = { id: string; slug: string; name: string; price: number; image: string; color: string; quantity: number }
type CartContextValue = { items: CartItem[]; isOpen: boolean; setIsOpen: (open: boolean) => void; addItem: (item: Omit<CartItem, 'id' | 'quantity'>, quantity?: number) => void; removeItem: (id: string) => void; updateQuantity: (id: string, quantity: number) => void; clearCart: () => void; total: number; itemCount: number; cartPulse: number }
const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [cartPulse, setCartPulse] = useState(0)
  useEffect(() => { try { const stored = window.localStorage.getItem('gemma-cart'); if (stored) setItems(JSON.parse(stored)) } catch {} setHydrated(true) }, [])
  useEffect(() => { if (hydrated) window.localStorage.setItem('gemma-cart', JSON.stringify(items)) }, [items, hydrated])
  const value = useMemo<CartContextValue>(() => ({ items, isOpen, setIsOpen, addItem: (item, quantity = 1) => { setItems(current => { const id = `${item.slug}-${item.color}`; const existing = current.find(line => line.id === id); return existing ? current.map(line => line.id === id ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { ...item, id, quantity }] }); setCartPulse(pulse => pulse + 1); setIsOpen(true) }, removeItem: id => setItems(current => current.filter(line => line.id !== id)), updateQuantity: (id, quantity) => setItems(current => quantity <= 0 ? current.filter(line => line.id !== id) : current.map(line => line.id === id ? { ...line, quantity } : line)), clearCart: () => setItems([]), total: items.reduce((sum, line) => sum + line.price * line.quantity, 0), itemCount: items.reduce((sum, line) => sum + line.quantity, 0), cartPulse }), [items, isOpen, hydrated, cartPulse])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('useCart debe usarse dentro de CartProvider'); return context }
