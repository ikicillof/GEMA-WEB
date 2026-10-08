import type { CartItem } from '@/lib/cart/cart-types'
import type { Product } from '@/types/product'

export function canStartCheckout(items: CartItem[]): boolean {
  return items.length > 0
}

export function findUnavailableItems(items: CartItem[], products: Product[]): CartItem[] {
  return items.filter((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product || !product.available) return true
    const color = product.colors.find((c) => c.name === item.color)
    return !color || !color.available
  })
}
