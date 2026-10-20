'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, LogOut, ShoppingBag, User } from 'lucide-react'
import { esStaff } from '@/lib/roles'
import { useAuth } from './auth-provider'

export function UserMenu() {
  const { sesion, abrirLogin, cerrarSesion } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  if (!sesion) {
    return <button type="button" className="cart-button user-button" onClick={() => abrirLogin('ingresar')} aria-label="Ingresar">
      <User size={19} strokeWidth={2.2} /><span className="hidden sm:inline">Ingresar</span>
    </button>
  }

  const nombre = sesion.user.displayName || sesion.user.email?.split('@')[0] || 'Mi cuenta'
  return <div className="user-menu" ref={ref}>
    <button type="button" className="cart-button user-button" onClick={() => setAbierto(!abierto)} aria-haspopup="menu" aria-expanded={abierto} aria-label={`Menú de ${nombre}`}>
      <User size={19} strokeWidth={2.2} /><span className="user-name hidden sm:inline">{nombre.split(' ')[0]}</span>
    </button>
    {abierto && <div className="user-dropdown" role="menu">
      <p className="user-dropdown-name">{nombre}</p>
      <Link href="/mis-compras" role="menuitem" onClick={() => setAbierto(false)}><ShoppingBag size={15} /> Mis compras</Link>
      {/* Solo comodidad: el panel igual verifica el rol en el servidor, quien no es del equipo ve la 404. */}
      {esStaff(sesion.rol) && <Link href="/admin" role="menuitem" onClick={() => setAbierto(false)}><LayoutDashboard size={15} /> Panel</Link>}
      <button type="button" role="menuitem" onClick={() => { setAbierto(false); void cerrarSesion() }}><LogOut size={15} /> Cerrar sesión</button>
    </div>}
  </div>
}
