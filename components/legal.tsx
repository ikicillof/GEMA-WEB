'use client'

import type { ReactNode } from 'react'
import { RANGO } from '@/lib/roles'
import { FECHA_LEGALES, esMarcador, marcadoresPendientes } from '@/lib/vendedora'
import { useAuth } from './auth-provider'

/** Un dato de la vendedora: si todavía es un marcador [ASÍ], se ve resaltado para que no se publique sin completar. */
export function Dato({ v }: { v: string }) {
  return esMarcador(v) ? <mark className="marcador">{v}</mark> : <>{v}</>
}

/** Email de contacto: link mailto cuando ya es un email real; marcador resaltado mientras falta. */
export function EmailContacto({ v }: { v: string }) {
  return esMarcador(v) ? <mark className="marcador">{v}</mark> : <a href={`mailto:${v}`}>{v}</a>
}

/**
 * Nota INTERNA arriba de cada página legal. Solo la ve quien ingresó como admin o creador: el público no la ve
 * (ni siquiera sale en el HTML que manda el servidor; se arma recién en el navegador, con la sesión).
 */
function NotaInterna({ extra }: { extra?: ReactNode }) {
  const { sesion } = useAuth()
  if (!sesion || RANGO[sesion.rol] < RANGO.admin) return null
  const pendientes = marcadoresPendientes()
  return <aside className="legal-nota" role="note" aria-label="Nota interna, solo para el equipo">
    <b>Nota interna (solo la ves vos; el público no la ve)</b>
    <p>Este texto es un <b>modelo</b>. Conviene que lo revise un contador o abogado antes de publicar.</p>
    {extra}
    {pendientes.length > 0
      ? <p>Datos pendientes de completar en <code>lib/vendedora.ts</code> ({pendientes.length}): {pendientes.map(p => p.valor).join(' · ')}</p>
      : <p>Todos los datos de la vendedora están completos.</p>}
  </aside>
}

/** Estructura común de las páginas legales: encabezado oscuro de la marca + texto cómodo de leer en el celular. */
export function LegalLayout({ kicker, titulo, nota, children }: { kicker: string; titulo: string; nota?: ReactNode; children: ReactNode }) {
  return <>
    <section className="page-hero legal-hero"><div className="shell">
      <p className="eyebrow">{kicker}</p>
      <h1 className="page-title legal-titulo">{titulo}</h1>
      <p className="page-hero-copy">Última actualización: {FECHA_LEGALES}</p>
    </div></section>
    <section className="legal"><div className="shell">
      <NotaInterna extra={nota} />
      <article className="legal-cuerpo">{children}</article>
    </div></section>
  </>
}
