export type CheckoutStep = 'cart' | 'shipping' | 'payment'

export function shouldRequireAuth(step: CheckoutStep, isAuthenticated: boolean): boolean {
  return step === 'payment' && !isAuthenticated
}
