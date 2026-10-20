'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdmin } from '@/components/admin/admin-shell'
import { CargaGemma } from '@/components/carga-gemma'

/** /admin lleva a la primera sección a la que tu rol da acceso. */
export default function AdminInicio() {
  const { puede } = useAdmin()
  const router = useRouter()
  const destino = puede('colaborador', 'ventas:ver') ? '/admin/ventas' : puede('colaborador', 'productos:ver') ? '/admin/productos' : null
  useEffect(() => { if (destino) router.replace(destino) }, [destino, router])
  if (!destino) return <div className="adm-card"><p className="adm-aviso adm-aviso--info">Todavía no tenés secciones habilitadas. Pedile acceso a quien administra el equipo.</p></div>
  return <CargaGemma mensaje="Abriendo el panel…" compacta />
}
