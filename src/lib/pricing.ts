export const TRANSFER_DISCOUNT_RATE = 0.1

export function computeTransferPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`computeTransferPrice: invalid price ${price}`)
  }
  return Math.round(price * (1 - TRANSFER_DISCOUNT_RATE))
}
