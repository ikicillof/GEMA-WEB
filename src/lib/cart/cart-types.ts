export type CartItem = {
  productId: string
  slug: string
  name: string
  color: string
  unitPrice: number
  quantity: number
  photo: string
}

export type CartState = {
  items: CartItem[]
}

export type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; productId: string; color: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; color: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; state: CartState }

export const EMPTY_CART: CartState = { items: [] }
