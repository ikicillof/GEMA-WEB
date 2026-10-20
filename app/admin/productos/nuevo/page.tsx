'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { FormularioProducto, valoresVacios } from '@/components/admin/producto-form'
import { Aviso } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'

function Nuevo() {
  const { api } = useAdmin()
  const [datos, setDatos] = useState<{ categorias: string[]; orden: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    api<{ productos: { categoria: string; orden: number }[] }>('/api/admin/productos').then(r => {
      if (cancelado) return
      if (!r.ok) { setError(r.cuerpo.error || 'No pudimos preparar el formulario.'); return }
      const ps = r.cuerpo.productos
      setDatos({ categorias: Array.from(new Set(ps.map(p => p.categoria).filter(Boolean))), orden: ps.reduce((m, p) => Math.max(m, p.orden), -1) + 1 })
    })
    return () => { cancelado = true }
  }, [api])

  return <>
    <Link href="/admin/productos" className="adm-volver"><ArrowLeft size={16} aria-hidden="true" />Todos los productos</Link>
    <div className="adm-head"><div><p className="eyebrow">Panel</p><h1 className="adm-title">Agregar producto</h1></div></div>
    {error && <Aviso tipo="error">{error}</Aviso>}
    {!datos && !error && <CargaGemma mensaje="Preparando el formulario…" compacta />}
    {datos && <FormularioProducto inicial={valoresVacios(datos.orden)} categorias={datos.categorias} />}
  </>
}

export default function NuevoProductoPage() {
  return <Acceso min="admin"><Nuevo /></Acceso>
}
