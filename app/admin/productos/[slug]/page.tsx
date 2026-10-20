'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { FormularioProducto, aValores, type ProductoApi } from '@/components/admin/producto-form'
import { Aviso } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'

function Editar() {
  const { slug } = useParams<{ slug: string }>()
  const { api, puede } = useAdmin()
  const [datos, setDatos] = useState<{ producto: ProductoApi; categorias: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      api<{ producto: ProductoApi }>(`/api/admin/productos/${encodeURIComponent(slug)}`),
      api<{ productos: { categoria: string }[] }>('/api/admin/productos'),
    ]).then(([p, lista]) => {
      if (cancelado) return
      if (!p.ok) { setError(p.cuerpo.error || 'No pudimos cargar el producto.'); return }
      setDatos({ producto: p.cuerpo.producto, categorias: Array.from(new Set((lista.ok ? lista.cuerpo.productos : []).map(x => x.categoria).filter(Boolean))) })
    })
    return () => { cancelado = true }
  }, [api, slug])

  return <>
    <Link href="/admin/productos" className="adm-volver"><ArrowLeft size={16} aria-hidden="true" />Todos los productos</Link>
    {error && <div className="adm-card"><Aviso tipo="error">{error}</Aviso></div>}
    {!datos && !error && <CargaGemma mensaje="Abriendo el producto…" compacta />}
    {datos && <>
      <div className="adm-head"><div><p className="eyebrow">Producto</p><h1 className="adm-title">{datos.producto.name}</h1></div></div>
      <FormularioProducto slug={datos.producto.slug} nombre={datos.producto.name} inicial={aValores(datos.producto)} provisorias={datos.producto.medidasProvisorias} categorias={datos.categorias} soloLectura={!puede('admin')} />
    </>}
  </>
}

export default function EditarProductoPage() {
  return <Acceso permiso="productos:ver"><Editar /></Acceso>
}
