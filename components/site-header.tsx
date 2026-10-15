'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from './cart-context'
import { GemiSidekick } from './gemi-sidekick'
import { GemmaStar } from './gemma-ornament'
import { UserMenu } from './user-menu'

const links = [{ href: '/', label: 'Inicio' }, { href: '/tienda', label: 'Tienda' }, { href: '/quienes-somos', label: 'Quiénes somos' }, { href: '/contacto', label: 'Contacto' }]

export function SiteHeader() {
  const pathname = usePathname()
  const { itemCount, setIsOpen, cartPulse } = useCart()
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const isHome = pathname === '/'
  // Página activa según la ruta (el sitio usa trailingSlash: "/tienda/" → "/tienda"). Tienda también marca las fichas de
  // producto; el carrito, el botón de arrepentimiento y la 404 no marcan ningún link.
  const route = pathname.replace(/\/+$/, '') || '/'
  const active = route === '/' ? '/' : route === '/tienda' || route.startsWith('/producto/') ? '/tienda' : route === '/quienes-somos' ? '/quienes-somos' : route === '/contacto' ? '/contacto' : null
  const navRef = useRef<HTMLElement>(null)
  const linkEls = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [indicator, setIndicator] = useState<{ x: number; w: number; shown: boolean; animate: boolean }>({ x: 0, w: 0, shown: false, animate: false })
  // Una sola línea que se desliza (transform + ancho) hasta el link activo; sin deslizarse la primera vez que aparece.
  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? linkEls.current[active] : null
      setIndicator(prev => el ? { x: el.offsetLeft, w: el.offsetWidth, shown: true, animate: prev.animate } : { ...prev, shown: false })
    }
    measure()
    const raf = requestAnimationFrame(() => setIndicator(prev => ({ ...prev, animate: true })))
    window.addEventListener('resize', measure); void document.fonts?.ready.then(measure)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure) }
  }, [active])
  useEffect(() => {
    const link = linkRef.current, img = imgRef.current
    if (!link || !img) return
    if (!isHome) { img.style.transform = ''; return }
    // El logo del hero (invisible, solo reserva el lugar) está fijo en pantalla mientras dura la puerta: se lee su posición en vivo.
    const update = () => {
      const hero = document.querySelector('.portal-logo'), stage = document.querySelector<HTMLElement>('.portal-stage')
      if (!hero || !stage) return
      const h = hero.getBoundingClientRect(), l = link.getBoundingClientRect(), w = img.offsetWidth || l.width
      // Viaja cuando la puerta ya está casi abierta (50% → 75% del tramo fijo; la puerta termina de abrir al 70%).
      const run = stage.offsetHeight - window.innerHeight
      const from = run > 0 ? run * 0.5 : 0, dist = run > 0 ? run * 0.25 : window.innerWidth < 700 ? 150 : 300
      const p = Math.min(1, Math.max(0, (window.scrollY - from) / dist)), e = p * p * (3 - 2 * p)
      img.style.transformOrigin = '0 0'
      img.style.transform = `translate(${(h.left - l.left) * (1 - e)}px, ${(h.top - l.top) * (1 - e)}px) scale(${1 + (h.width / w - 1) * (1 - e)})`
    }
    const init = () => { if (document.querySelector('.portal-logo')) { update(); return } if (tries++ < 120) raf = requestAnimationFrame(init) }
    let raf = 0, tries = 0
    init()
    const onResize = update
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', update); window.removeEventListener('resize', onResize); img.style.transform = '' }
  }, [isHome])
  useEffect(() => { const onScroll = () => setCompact(window.scrollY > 80); onScroll(); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll) }, [])
  return <header className={`site-header ${compact ? 'site-header--compact' : ''}`}>
    <div className="shell flex h-full items-center justify-between gap-5"><Link ref={linkRef} href="/" aria-label="Gemma, inicio" className={`header-logo ${isHome ? 'header-logo--fly' : ''}`} onClick={() => setMenuOpen(false)}><Image ref={imgRef} src="/productos/logo-transparent.png" alt="Gemma" width={433} height={190} priority className="h-auto w-[108px] sm:w-[132px]" /></Link><nav ref={navRef} className="relative hidden items-center gap-7 md:flex" aria-label="Navegación principal">{links.map(link => <Link key={link.href} ref={el => { linkEls.current[link.href] = el }} href={link.href} aria-current={active === link.href ? 'page' : undefined} className={`nav-link ${active === link.href ? 'nav-link--active' : ''}`}>{link.label}</Link>)}<span className={`nav-indicator ${indicator.animate ? 'nav-indicator--animate' : ''}`} aria-hidden="true" style={{ width: indicator.w, transform: `translateX(${indicator.x}px)`, opacity: indicator.shown ? 1 : 0 }} /></nav><div className="flex items-center gap-2"><UserMenu /><button key={cartPulse} type="button" className={`cart-button ${cartPulse ? 'cart-button--pulse' : ''}`} onClick={() => setIsOpen(true)} aria-label={`Abrir carrito, ${itemCount} productos`}><ShoppingBag size={19} strokeWidth={2.2} /><span className="hidden sm:inline">Carrito</span><b>{itemCount}</b><span className="cart-sparkles" aria-hidden="true"><GemmaStar size={9} /><GemmaStar size={7} /></span></button><button type="button" className="menu-button md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></div>
    {cartPulse > 0 && <div key={cartPulse} className="cart-gemi-flight" aria-hidden="true"><GemiSidekick tone="pink" /></div>}
    {menuOpen && <div className="mobile-menu md:hidden">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} aria-current={active === link.href ? 'page' : undefined} className={active === link.href ? 'mobile-link mobile-link--active' : 'mobile-link'}>{link.label}</Link>)}</div>}
  </header>
}
