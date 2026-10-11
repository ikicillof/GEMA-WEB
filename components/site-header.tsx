'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  useEffect(() => { const onScroll = () => setCompact(window.scrollY > 80); onScroll(); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll) }, [])
  return <header className={`site-header ${compact ? 'site-header--compact' : ''}`}>
    <div className="shell flex h-full items-center justify-between gap-5"><Link href="/" aria-label="Gemma, inicio" className="header-logo" onClick={() => setMenuOpen(false)}><Image src="/productos/logo-transparent.png" alt="Gemma" width={433} height={190} priority className="h-auto w-[108px] sm:w-[132px]" /></Link><nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">{links.map(link => <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? 'nav-link--active' : ''}`}>{link.label}</Link>)}</nav><div className="flex items-center gap-2"><button key={cartPulse} type="button" className={`cart-button ${cartPulse ? 'cart-button--pulse' : ''}`} onClick={() => setIsOpen(true)} aria-label={`Abrir carrito, ${itemCount} productos`}><ShoppingBag size={19} strokeWidth={2.2} /><span className="hidden sm:inline">Carrito</span><b>{itemCount}</b><span className="cart-sparkles" aria-hidden="true"><GemmaStar size={9} /><GemmaStar size={7} /></span></button><button type="button" className="menu-button md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></div>
    {cartPulse > 0 && <div key={cartPulse} className="cart-gemi-flight" aria-hidden="true"><GemiSidekick tone="pink" /></div>}
    {menuOpen && <div className="mobile-menu md:hidden">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={pathname === link.href ? 'mobile-link mobile-link--active' : 'mobile-link'}>{link.label}</Link>)}</div>}
  </header>
}
