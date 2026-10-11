'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from './cart-context'
import { GemiSidekick } from './gemi-sidekick'
import { GemmaStar } from './gemma-ornament'

const links = [{ href: '/', label: 'Inicio' }, { href: '/tienda', label: 'Tienda' }, { href: '/quienes-somos', label: 'Quiénes somos' }, { href: '/contacto', label: 'Contacto' }]

export function SiteHeader() {
  const pathname = usePathname()
  const { itemCount, setIsOpen, cartPulse } = useCart()
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const isHome = pathname === '/'
  useEffect(() => {
    const link = linkRef.current, img = imgRef.current
    if (!link || !img) return
    if (!isHome) { img.style.transform = ''; return }
    let hero: { x: number; y: number; w: number } | null = null, raf = 0, tries = 0
    const measure = () => { const el = document.querySelector('.portal-logo'); if (!el) return false; const r = el.getBoundingClientRect(); hero = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width }; return true }
    const update = () => {
      if (!hero) return
      const l = link.getBoundingClientRect(), w = img.offsetWidth || l.width
      const dist = window.innerWidth < 700 ? 150 : 300
      const p = Math.min(1, Math.max(0, window.scrollY / dist)), e = p * p * (3 - 2 * p)
      const s = 1 + (hero.w / w - 1) * (1 - e)
      img.style.transformOrigin = '0 0'
      img.style.transform = `translate(${(hero.x - window.scrollX - l.left) * (1 - e)}px, ${(hero.y - window.scrollY - l.top) * (1 - e)}px) scale(${s})`
    }
    const init = () => { if (measure()) { update(); return } if (tries++ < 120) raf = requestAnimationFrame(init) }
    const onResize = () => { img.style.transform = ''; if (window.scrollY < 2) measure(); update() }
    init()
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', update); window.removeEventListener('resize', onResize); img.style.transform = '' }
  }, [isHome])
  useEffect(() => { const onScroll = () => setCompact(window.scrollY > 80); onScroll(); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll) }, [])
  return <header className={`site-header ${compact ? 'site-header--compact' : ''}`}>
    <div className="shell flex h-full items-center justify-between gap-5"><Link ref={linkRef} href="/" aria-label="Gemma, inicio" className={`header-logo ${isHome ? 'header-logo--fly' : ''}`} onClick={() => setMenuOpen(false)}><Image ref={imgRef} src="/productos/logo-transparent.png" alt="Gemma" width={433} height={190} priority className="h-auto w-[108px] sm:w-[132px]" /></Link><nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">{links.map(link => <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? 'nav-link--active' : ''}`}>{link.label}</Link>)}</nav><div className="flex items-center gap-2"><button key={cartPulse} type="button" className={`cart-button ${cartPulse ? 'cart-button--pulse' : ''}`} onClick={() => setIsOpen(true)} aria-label={`Abrir carrito, ${itemCount} productos`}><ShoppingBag size={19} strokeWidth={2.2} /><span className="hidden sm:inline">Carrito</span><b>{itemCount}</b><span className="cart-sparkles" aria-hidden="true"><GemmaStar size={9} /><GemmaStar size={7} /></span></button><button type="button" className="menu-button md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></div>
    {cartPulse > 0 && <div key={cartPulse} className="cart-gemi-flight" aria-hidden="true"><GemiSidekick tone="pink" /></div>}
    {menuOpen && <div className="mobile-menu md:hidden">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={pathname === link.href ? 'mobile-link mobile-link--active' : 'mobile-link'}>{link.label}</Link>)}</div>}
  </header>
}
