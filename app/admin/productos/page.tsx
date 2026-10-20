'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { mini } from '@/components/admin/fotos'
import { aEntrada, aValores, type ProductoApi } from '@/components/admin/producto-form'
import { Aviso, Confirmar } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'
import { formatPrice } from '@/lib/products'

type Fila = { slug: string; name: string; price: number; categoria: string; activo: boolean; orden: number; image: string; medidasProvisorias: boolean }
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function Productos() {
  const { api, puede, avisar } = useAdmin()
  const [lista, setLista] = useState<Fila[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [visibilidad, setVisibilidad] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<Fila | null>(null)
  const esAdmin = puede('admin')

  const cargar = useCallback(async () => {
    const r = await api<{ productos: Fila[] }>('/api/admin/productos')
    if (r.ok) { setLista(r.cuerpo.productos); setError(null) } else setError(r.cuerpo.error || 'No pudimos cargar los productos.')
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  const categorias = useMemo(() => Array.from(new Set((lista ?? []).map(p => p.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [lista])
  const filtrados = useMemo(() => {
    const busca = normal(q)
    return (lista ?? []).filter(p => (!categoria || p.categoria === categoria) && (!visibilidad || (visibilidad === 'activo') === p.activo) && (!busca || normal(`${p.name} ${p.slug} ${p.categoria}`).includes(busca)))
  }, [lista, q, categoria, visibilidad])
  const provisorias = (lista ?? []).filter(p => p.medidasProvisorias).length

  /** Ocultar o mostrar: trae el producto completo y lo guarda con `activo` cambiado (el servidor valida todo de nuevo). */
  async function alternar(p: Fila) {
    setTrabajando(p.slug)
    const completo = await api<{ producto: ProductoApi }>(`/api/admin/productos/${encodeURIComponent(p.slug)}`)
    if (!completo.ok) { setTrabajando(null); avisar(completo.cuerpo.error || 'No pudimos cargar el producto.', true); return }
    const v = aValores(completo.cuerpo.producto)
    const r = await api(`/api/admin/productos/${encodeURIComponent(p.slug)}`, { method: 'PUT', body: JSON.stringify(aEntrada({ ...v, activo: !p.activo })) })
    setTrabajando(null)
    if (!r.ok) { avisar(r.cuerpo.campos?.length ? 'Este producto tiene datos que hay que corregir antes. Abrilo y guardalo.' : r.cuerpo.error || 'No pudimos cambiar el producto.', true); return }
    avisar(p.activo ? `«${p.name}» quedó oculto.` : `«${p.name}» ya se ve en la tienda.`)
    await cargar()
  }

  async function eliminar() {
    if (!aEliminar) return
    setTrabajando(aEliminar.slug)
    const r = await api(`/api/admin/productos/${encodeURIComponent(aEliminar.slug)}`, { method: 'DELETE' })
    setTrabajando(null)
    const nombre = aEliminar.name
    setAEliminar(null)
    if (!r.ok) { avisar(r.cuerpo.error || 'No pudimos eliminar el producto.', true); return }
    avisar(`«${nombre}» se eliminó.`)
    await cargar()
  }

  return <>
    <div className="adm-head">
      <div><p className="eyebrow">Panel</p><h1 className="adm-title">Productos</h1></div>
      {esAdmin && <Link href="/admin/productos/nuevo" className="button button--pink adm-btn"><Plus size={16} aria-hidden="true" />Agregar producto</Link>}
    </div>

    {error && <Aviso tipo="error">{error}</Aviso>}
    {provisorias > 0 && <Aviso><b>Medidas provisorias:</b> {provisorias === 1 ? '1 producto necesita' : `${provisorias} productos necesitan`} el peso y las medidas reales para cotizar bien el envío.</Aviso>}

    <div className="adm-toolbar">
      <input className="adm-input" type="search" inputMode="search" placeholder="Buscar producto" aria-label="Buscar producto" value={q} onChange={e => setQ(e.target.value)} />
      <div className="adm-filtros">
        <select className="adm-select" aria-label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="adm-select" aria-label="Visibilidad" value={visibilidad} onChange={e => setVisibilidad(e.target.value)}>
          <option value="">Visibles y ocultos</option>
          <option value="activo">Solo visibles</option>
          <option value="oculto">Solo ocultos</option>
        </select>
      </div>
    </div>

    {!lista && !error && <CargaGemma mensaje="Buscando los productos…" compacta />}
    {lista && (filtrados.length === 0
      ? <div className="adm-card adm-vacio">{lista.length === 0 ? 'Todavía no hay productos.' : 'Ningún producto coincide con los filtros.'}</div>
      : <ul className="adm-lista">{filtrados.map(p =>
        <li key={p.slug} className="adm-fila">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {p.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mini(p.image)} alt="" width={56} height={56} loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 14, background: '#f1ebe4', flex: 'none' }} />
              : <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 14, background: '#f1ebe4', flex: 'none' }} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="adm-fila-titulo">{p.name}</p>
              <div className="adm-fila-meta"><span className="adm-fila-precio">{formatPrice(p.price)}</span><span>·</span><span>{p.categoria || 'Sin categoría'}</span><span>·</span><span>Orden {p.orden}</span></div>
            </div>
          </div>
          <div className="adm-fila-meta">
            <span className={`adm-chip ${p.activo ? 'adm-chip--ok' : ''}`}>{p.activo ? 'Visible' : 'Oculto'}</span>
            {p.medidasProvisorias && <span className="adm-chip adm-chip--espera">Medidas provisorias</span>}
          </div>
          <div className="adm-actions">
            <Link href={`/admin/productos/${p.slug}`} className="button adm-btn adm-btn--ghost"><Pencil size={16} aria-hidden="true" />{esAdmin ? 'Editar' : 'Ver'}</Link>
            {esAdmin && <button type="button" className="button adm-btn adm-btn--ghost" disabled={trabajando === p.slug} onClick={() => alternar(p)}>
              {p.activo ? <><EyeOff size={16} aria-hidden="true" />Ocultar</> : <><Eye size={16} aria-hidden="true" />Mostrar</>}
            </button>}
            {esAdmin && <button type="button" className="button adm-btn adm-btn--ghost" disabled={trabajando === p.slug} onClick={() => setAEliminar(p)}><Trash2 size={16} aria-hidden="true" />Eliminar</button>}
          </div>
        </li>)}</ul>)}

    {aEliminar && <Confirmar titulo={`¿Eliminar ${aEliminar.name}?`} texto="Se borra del catálogo y no se puede deshacer. Las ventas ya hechas conservan sus datos. Si solo querés que no se vea, ocultalo." confirmar="Sí, eliminar" peligro ocupado={trabajando === aEliminar.slug} onConfirmar={eliminar} onCancelar={() => trabajando === null && setAEliminar(null)} />}
  </>
}

export default function ProductosPage() {
  return <Acceso permiso="productos:ver"><Productos /></Acceso>
}
