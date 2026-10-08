import Link from 'next/link'

export function Header({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-4 py-3 shadow-[var(--shadow-float)]">
      <Link href="/" className="font-semibold">
        Gemma
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-4 text-sm">
        <Link href="/categoria/lamparas">Categorías</Link>
        <Link href="/carrito" className="relative" aria-label={cartCount > 0 ? `Carrito, ${cartCount} artículos` : 'Carrito'}>
          🛍
          {cartCount > 0 && (
            <span
              data-testid="cart-count"
              className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px]"
            >
              {cartCount}
            </span>
          )}
        </Link>
      </nav>
    </header>
  )
}
