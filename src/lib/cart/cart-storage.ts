import { EMPTY_CART, type CartState } from './cart-types'

const STORAGE_KEY = 'gemma_cart_v1'

export function loadCart(): CartState {
  if (typeof window === 'undefined') return EMPTY_CART
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_CART
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) return EMPTY_CART
    return parsed as CartState
  } catch {
    return EMPTY_CART
  }
}

export function saveCart(state: CartState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota excedida);
    // el carrito sigue funcionando en memoria para esta sesión.
  }
}
