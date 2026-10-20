'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Package, Receipt, Settings, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { CargaGemma } from '@/components/carga-gemma'
import { NotFoundExperience } from '@/components/not-found-experience'
import { RANGO, type Permiso, type Rol } from '@/lib/roles'

type Yo = { rol: Rol; permisos: Permiso[]; email: string }
type Estado = { tipo: 'cargando' } | { tipo: 'ok'; yo: Yo } | { tipo: 'negado' } | { tipo: 'error'; mensaje: string }

export type Respuesta<T> = { ok: boolean; status: number; cuerpo: T & { error?: string; campos?: string[] } }

type Contexto = {
  yo: Yo
  /** fetch contra /api/admin con la sesión. El servidor vuelve a verificar el rol en CADA llamada. */
  api: <T = Record<string, unknown>>(url: string, init?: RequestInit) => Promise<Respuesta<T>>
  puede: (min?: Rol, permiso?: Permiso) => boolean
  avisar: (texto: string, error?: boolean) => void
}

const Ctx = createContext<Contexto | null>(null)

export function useAdmin() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdmin debe usarse dentro del panel')
  return c
}

/** Un colaborador solo entra si tiene el permiso; admin y creador entran siempre (igual que en el servidor). */
const permitido = (yo: Yo, min: Rol, permiso?: Permiso) =>
  RANGO[yo.rol] >= RANGO[min] && (!permiso || yo.rol !== 'colaborador' || yo.permisos.includes(permiso))

const PESTANAS = [
  { href: '/admin/ventas', texto: 'Ventas', Icono: Receipt, min: 'colaborador' as Rol, permiso: 'ventas:ver' as Permiso },
  { href: '/admin/productos', texto: 'Productos', Icono: Package, min: 'colaborador' as Rol, permiso: 'productos:ver' as Permiso },
  { href: '/admin/equipo', texto: 'Equipo', Icono: Users, min: 'admin' as Rol },
  { href: '/admin/configuracion', texto: 'Configuración', Icono: Settings, min: 'admin' as Rol },
]

/**
 * Puerta de TODAS las páginas del panel. En cada página (cada cambio de ruta) le pregunta al servidor quién es la persona
 * (/api/admin/yo lee el rol fresco de Firebase). Quien no es del equipo ve la 404 y no recibe ningún dato: los datos solo
 * salen de /api/admin/*, que además verifica el rol en cada llamada. Esconder botones nunca es la protección.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { sesion, cargando, llamar } = useAuth()
  const pathname = usePathname()
  const uid = sesion?.user.uid
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [toast, setToast] = useState<{ texto: string; error: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (cargando) return
    if (!uid) { setEstado({ tipo: 'negado' }); return }
    let cancelado = false
    llamar('/api/admin/yo').then(async r => {
      if (cancelado) return
      if (r.ok) {
        const c = await r.json()
        setEstado({ tipo: 'ok', yo: { rol: c.rol, permisos: Array.isArray(c.permisos) ? c.permisos : [], email: String(c.email ?? '') } })
      } else if (r.status === 404 || r.status === 401 || r.status === 403) {
        setEstado({ tipo: 'negado' })
      } else {
        setEstado({ tipo: 'error', mensaje: r.status === 429 ? 'Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo.' : 'No pudimos abrir el panel. Probá de nuevo.' })
      }
    }).catch(() => { if (!cancelado) setEstado({ tipo: 'error', mensaje: 'No pudimos abrir el panel. Revisá tu conexión.' }) })
    return () => { cancelado = true }
  }, [cargando, uid, llamar, pathname, intento])

  useEffect(() => () => clearTimeout(timer.current), [])

  const api = useCallback(async <T,>(url: string, init?: RequestInit): Promise<Respuesta<T>> => {
    try {
      const r = await llamar(url, init)
      const cuerpo = await r.json().catch(() => ({}))
      return { ok: r.ok, status: r.status, cuerpo }
    } catch {
      return { ok: false, status: 0, cuerpo: { error: 'No hay conexión. Revisá tu internet y probá de nuevo.' } as Respuesta<T>['cuerpo'] }
    }
  }, [llamar])

  const avisar = useCallback((texto: string, error = false) => {
    setToast({ texto, error })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  const yo = estado.tipo === 'ok' ? estado.yo : null
  const valor = useMemo<Contexto | null>(() => yo ? { yo, api, avisar, puede: (min = 'colaborador', permiso) => permitido(yo, min, permiso) } : null, [yo, api, avisar])

  if (estado.tipo === 'negado') return <NotFoundExperience />
  if (estado.tipo === 'error') {
    return <div className="adm"><div className="shell"><div className="adm-card">
      <p className="adm-aviso adm-aviso--error" role="alert">{estado.mensaje}</p>
      <button type="button" className="button button--pink adm-btn" onClick={() => setIntento(n => n + 1)}>Reintentar</button>
    </div></div></div>
  }
  if (!valor || !yo) return <CargaGemma mensaje="Abriendo el panel…" />

  const ruta = pathname.replace(/\/+$/, '')
  return <Ctx.Provider value={valor}>
    <div className="adm">
      <div className="shell">
        <nav className="adm-tabs" aria-label="Secciones del panel">
          {PESTANAS.filter(p => permitido(yo, p.min, p.permiso)).map(({ href, texto, Icono }) =>
            <Link key={href} href={href} className={`adm-tab${ruta === href || ruta.startsWith(`${href}/`) ? ' adm-tab--on' : ''}`} aria-current={ruta === href || ruta.startsWith(`${href}/`) ? 'page' : undefined}>
              <Icono size={16} aria-hidden="true" />{texto}
            </Link>)}
        </nav>
        {children}
      </div>
    </div>
    {toast && <div className={`adm-toast${toast.error ? ' adm-toast--error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.texto}</div>}
  </Ctx.Provider>
}

/**
 * Guarda de cada página: si tu rol no alcanza, no se muestra nada.
 * Páginas solo de admin → 404 para el resto del equipo; páginas con permiso puntual → un mensaje claro.
 */
export function Acceso({ min = 'colaborador', permiso, children }: { min?: Rol; permiso?: Permiso; children: React.ReactNode }) {
  const { yo } = useAdmin()
  if (permitido(yo, min, permiso)) return <>{children}</>
  if (RANGO[min] > RANGO.colaborador) return <NotFoundExperience />
  return <div className="adm-card"><p className="adm-aviso adm-aviso--info" role="status">No tenés permiso para ver esta sección. Pedile acceso a quien administra el equipo.</p></div>
}
