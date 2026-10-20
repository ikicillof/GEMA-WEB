'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Box, Trash2, X } from 'lucide-react'
import { CargaGemma } from '@/components/carga-gemma'
import { colorHex, standardColors } from '@/lib/products'
import { useAdmin } from './admin-shell'
import { Campo } from './campo'
import { Fotos, useSubida } from './fotos'
import { Aviso, Confirmar } from './ui'

/** Lo que devuelve GET /api/admin/productos/{slug}. */
export type ProductoApi = {
  slug: string; name: string; price: number; tag: string; categoria: string; description: string; detail: string
  colors: string[]; colorLabel: string; images: string[]; modelo3d: string | null; featured: boolean; activo: boolean; orden: number
  pesoGramos: number | null; altoCm: number | null; anchoCm: number | null; largoCm: number | null; medidasProvisorias: boolean
}

/** Los valores del formulario (los números son texto mientras se escriben). */
export type Valores = {
  name: string; price: string; tag: string; categoria: string; description: string; detail: string
  colors: string[]; colorLabel: string; images: string[]; modelo3d: string | null; featured: boolean; activo: boolean; orden: string
  peso: string; alto: string; ancho: string; largo: string; confirmarMedidas: boolean
}

export const valoresVacios = (orden: number): Valores => ({
  name: '', price: '', tag: '', categoria: '', description: '', detail: '', colors: [], colorLabel: '', images: [], modelo3d: null,
  featured: false, activo: true, orden: String(orden), peso: '', alto: '', ancho: '', largo: '', confirmarMedidas: false,
})

const texto = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))
export const aValores = (p: ProductoApi): Valores => ({
  name: p.name, price: String(p.price), tag: p.tag, categoria: p.categoria, description: p.description, detail: p.detail,
  colors: p.colors, colorLabel: p.colorLabel, images: p.images, modelo3d: p.modelo3d, featured: p.featured, activo: p.activo, orden: String(p.orden),
  peso: texto(p.pesoGramos), alto: texto(p.altoCm), ancho: texto(p.anchoCm), largo: texto(p.largoCm), confirmarMedidas: false,
})

/** Número escrito con coma o punto. Vacío = null; ilegible = NaN. */
const numero = (s: string): number | null => { const t = s.trim().replace(',', '.'); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN }

/** Cuerpo exacto que espera PUT/POST /api/admin/productos (el servidor rechaza cualquier campo de más). */
export function aEntrada(v: Valores) {
  return {
    name: v.name.trim(), price: numero(v.price), tag: v.tag.trim(), categoria: v.categoria.trim(), description: v.description.trim(), detail: v.detail.trim(),
    colors: v.colors, colorLabel: v.colorLabel.trim(), images: v.images, modelo3d: v.modelo3d, featured: v.featured, activo: v.activo, orden: numero(v.orden),
    pesoGramos: numero(v.peso), altoCm: numero(v.alto), anchoCm: numero(v.ancho), largoCm: numero(v.largo), confirmarMedidas: v.confirmarMedidas,
  }
}

type Errores = Partial<Record<keyof Valores, string>>
const ORDEN_CAMPOS: (keyof Valores)[] = ['name', 'price', 'categoria', 'tag', 'description', 'detail', 'colorLabel', 'peso', 'alto', 'ancho', 'largo', 'orden']
const CAMPO_DE_SERVIDOR: Record<string, keyof Valores> = { pesoGramos: 'peso', altoCm: 'alto', anchoCm: 'ancho', largoCm: 'largo' }

function validar(v: Valores): Errores {
  const e: Errores = {}
  const nombre = v.name.trim()
  if (nombre.length < 2) e.name = 'Escribí el nombre (mínimo 2 letras).'
  else if (nombre.length > 80) e.name = 'El nombre es muy largo (máximo 80).'
  const precio = numero(v.price)
  if (precio == null || Number.isNaN(precio) || !Number.isInteger(precio) || precio < 1 || precio > 10_000_000) e.price = 'Ingresá el precio en pesos, sin centavos.'
  if (!v.categoria.trim()) e.categoria = 'Elegí o escribí una categoría.'
  else if (v.categoria.trim().length > 40) e.categoria = 'Máximo 40 letras.'
  if (v.tag.trim().length > 40) e.tag = 'Máximo 40 letras.'
  if (v.description.trim().length > 600) e.description = 'Máximo 600 letras.'
  if (v.detail.trim().length > 2000) e.detail = 'Máximo 2000 letras.'
  if (v.colorLabel.trim().length > 40) e.colorLabel = 'Máximo 40 letras.'
  const orden = numero(v.orden)
  if (orden == null || Number.isNaN(orden) || !Number.isInteger(orden) || orden < 0) e.orden = 'Ingresá un número entero (0 o más).'
  for (const [k, max] of [['peso', 100_000], ['alto', 500], ['ancho', 500], ['largo', 500]] as const) {
    const n = numero(v[k])
    if (n != null && (Number.isNaN(n) || n <= 0 || n > max)) e[k] = k === 'peso' ? 'Ingresá el peso en gramos (mayor que 0).' : 'Ingresá la medida en cm (mayor que 0).'
  }
  return e
}

export function FormularioProducto({ slug, inicial, provisorias = false, categorias, soloLectura = false, nombre }: {
  slug?: string
  inicial: Valores
  provisorias?: boolean
  categorias: string[]
  soloLectura?: boolean
  nombre?: string
}) {
  const { api, puede, avisar } = useAdmin()
  const router = useRouter()
  const subir = useSubida()
  const [v, setV] = useState<Valores>(inicial)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendoModelo, setSubiendoModelo] = useState(false)
  const [errorModelo, setErrorModelo] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [ocupadoEliminar, setOcupadoEliminar] = useState(false)

  const poner = <K extends keyof Valores>(k: K, valor: Valores[K]) => { setV(p => ({ ...p, [k]: valor })); setErrores(p => (p[k] ? { ...p, [k]: undefined } : p)) }
  const medidasCompletas = [v.peso, v.alto, v.ancho, v.largo].every(x => x.trim())

  function alternarColor(nombreColor: string) {
    poner('colors', v.colors.includes(nombreColor) ? v.colors.filter(c => c !== nombreColor) : [...v.colors, nombreColor])
  }

  async function elegirModelo(archivo: File | undefined) {
    if (!archivo) return
    setErrorModelo(null)
    setSubiendoModelo(true)
    try { poner('modelo3d', await subir(archivo, 'modelo')) } catch (e) { setErrorModelo((e as Error).message) }
    setSubiendoModelo(false)
  }

  const enfocar = (k: string) => { const el = document.getElementById(`pf-${k}`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus() } }

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    setErrorGeneral(null)
    const errs = validar(v)
    setErrores(errs)
    const primero = ORDEN_CAMPOS.find(k => errs[k])
    if (primero) { enfocar(primero); return }
    setGuardando(true)
    const cuerpo = JSON.stringify(aEntrada(v))
    const r = slug
      ? await api(`/api/admin/productos/${encodeURIComponent(slug)}`, { method: 'PUT', body: cuerpo })
      : await api('/api/admin/productos', { method: 'POST', body: cuerpo })
    setGuardando(false)
    if (!r.ok) {
      const delServidor: Errores = {}
      for (const c of r.cuerpo.campos ?? []) { const k = (CAMPO_DE_SERVIDOR[c.split('.')[0]] ?? c.split('.')[0]) as keyof Valores; if (k in v) delServidor[k] = 'Revisá este dato.' }
      setErrores(delServidor)
      setErrorGeneral(r.cuerpo.error || 'No pudimos guardar el producto.')
      const k = ORDEN_CAMPOS.find(x => delServidor[x]); if (k) enfocar(k)
      return
    }
    avisar(slug ? 'Cambios guardados. Ya se ven en la tienda.' : 'Producto creado. Ya se ve en la tienda.')
    router.push('/admin/productos')
  }

  async function eliminar() {
    if (!slug) return
    setOcupadoEliminar(true)
    const r = await api(`/api/admin/productos/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    setOcupadoEliminar(false)
    setEliminando(false)
    if (!r.ok) { setErrorGeneral(r.cuerpo.error || 'No pudimos eliminar el producto.'); return }
    avisar('Producto eliminado.')
    router.push('/admin/productos')
  }

  const puedeEditar = !soloLectura && puede('admin')
  return <form onSubmit={guardar} noValidate>
    {soloLectura && <Aviso tipo="info">Podés ver este producto, pero solo admin o creador pueden cambiarlo.</Aviso>}
    {provisorias && <Aviso><b>Medidas provisorias:</b> completá el peso y las medidas reales. Hasta entonces el envío de este producto no se cotiza con datos reales.</Aviso>}
    {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

    <fieldset disabled={!puedeEditar || guardando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="adm-card">
        <h2>Datos del producto</h2>
        <div className="adm-grid adm-grid--2">
          <Campo etiqueta="Nombre" error={errores.name}><input id="pf-name" className="adm-input" value={v.name} maxLength={80} autoComplete="off" aria-invalid={!!errores.name} onChange={e => poner('name', e.target.value)} /></Campo>
          <Campo etiqueta="Precio (pesos)" error={errores.price}><input id="pf-price" className="adm-input" inputMode="numeric" value={v.price} aria-invalid={!!errores.price} onChange={e => poner('price', e.target.value.replace(/[^\d]/g, ''))} /></Campo>
          <Campo etiqueta="Categoría" error={errores.categoria} ayuda="Elegí una existente o escribí una nueva.">
            <input id="pf-categoria" className="adm-input" list="pf-categorias" value={v.categoria} maxLength={40} autoComplete="off" aria-invalid={!!errores.categoria} onChange={e => poner('categoria', e.target.value)} />
          </Campo>
          <datalist id="pf-categorias">{categorias.map(c => <option key={c} value={c} />)}</datalist>
          <Campo etiqueta="Etiqueta corta (opcional)" error={errores.tag} ayuda="Aparece sobre la foto, por ejemplo «Nuevo».">
            <input id="pf-tag" className="adm-input" value={v.tag} maxLength={40} autoComplete="off" aria-invalid={!!errores.tag} onChange={e => poner('tag', e.target.value)} />
          </Campo>
        </div>
        <div className="adm-grid" style={{ marginTop: 14 }}>
          <Campo etiqueta="Descripción corta" error={errores.description}><textarea id="pf-description" className="adm-textarea" value={v.description} maxLength={600} aria-invalid={!!errores.description} onChange={e => poner('description', e.target.value)} /></Campo>
          <Campo etiqueta="Detalle (opcional)" error={errores.detail} ayuda="Materiales, cuidados, tamaño."><textarea id="pf-detail" className="adm-textarea" value={v.detail} maxLength={2000} aria-invalid={!!errores.detail} onChange={e => poner('detail', e.target.value)} /></Campo>
        </div>
      </div>

      <div className="adm-card">
        <h2>Colores</h2>
        <div className="adm-colores" role="group" aria-label="Colores disponibles">
          {[...standardColors.map(c => c.name), 'Gris'].map(c =>
            <button key={c} type="button" className={`adm-color${v.colors.includes(c) ? ' adm-color--on' : ''}`} aria-pressed={v.colors.includes(c)} onClick={() => alternarColor(c)}>
              <i style={{ background: colorHex(c) }} aria-hidden="true" />{c}
            </button>)}
        </div>
        <div style={{ marginTop: 14 }}>
          <Campo etiqueta="Texto del selector (opcional)" error={errores.colorLabel} ayuda="Por ejemplo «Elegí tu color».">
            <input id="pf-colorLabel" className="adm-input" value={v.colorLabel} maxLength={40} autoComplete="off" aria-invalid={!!errores.colorLabel} onChange={e => poner('colorLabel', e.target.value)} />
          </Campo>
        </div>
      </div>

      <div className="adm-card">
        <h2>Fotos</h2>
        <Fotos valor={v.images} onCambio={x => poner('images', x)} />
      </div>

      <div className="adm-card">
        <h2>Modelo 3D (opcional)</h2>
        {errorModelo && <Aviso tipo="error">{errorModelo}</Aviso>}
        {v.modelo3d
          ? <div className="adm-fila-top"><span className="adm-fila-meta"><Box size={18} aria-hidden="true" />{decodeURIComponent(v.modelo3d.split('/').pop() ?? v.modelo3d)}</span>
              <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => poner('modelo3d', null)}><X size={16} aria-hidden="true" />Quitar</button></div>
          : <label className="button adm-btn adm-btn--ghost" style={{ cursor: 'pointer' }}>
              <Box size={16} aria-hidden="true" />Subir modelo (.glb)
              <input type="file" accept=".glb,model/gltf-binary" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} disabled={subiendoModelo} onChange={e => { void elegirModelo(e.target.files?.[0]); e.target.value = '' }} />
            </label>}
        <p className="adm-sub">Se guarda con el producto. Todavía no se muestra en la ficha de la tienda: falta activar el visor «Ver en 3D».</p>
        <CargaGemma mensaje="Subiendo el modelo…" activa={subiendoModelo} compacta />
      </div>

      <div className="adm-card">
        <h2>Peso y medidas del paquete</h2>
        <div className="adm-grid adm-grid--4">
          <Campo etiqueta="Peso (gramos)" error={errores.peso}><input id="pf-peso" className="adm-input" inputMode="decimal" value={v.peso} aria-invalid={!!errores.peso} onChange={e => poner('peso', e.target.value)} /></Campo>
          <Campo etiqueta="Alto (cm)" error={errores.alto}><input id="pf-alto" className="adm-input" inputMode="decimal" value={v.alto} aria-invalid={!!errores.alto} onChange={e => poner('alto', e.target.value)} /></Campo>
          <Campo etiqueta="Ancho (cm)" error={errores.ancho}><input id="pf-ancho" className="adm-input" inputMode="decimal" value={v.ancho} aria-invalid={!!errores.ancho} onChange={e => poner('ancho', e.target.value)} /></Campo>
          <Campo etiqueta="Largo (cm)" error={errores.largo}><input id="pf-largo" className="adm-input" inputMode="decimal" value={v.largo} aria-invalid={!!errores.largo} onChange={e => poner('largo', e.target.value)} /></Campo>
        </div>
        {provisorias && medidasCompletas && <label className="adm-check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={v.confirmarMedidas} onChange={e => poner('confirmarMedidas', e.target.checked)} />
          Son las medidas reales (apaga el aviso aunque no las hayas cambiado)
        </label>}
        <p className="adm-sub">Se usan para cotizar el envío. Al guardar medidas nuevas y completas, el aviso de «medidas provisorias» se apaga.</p>
      </div>

      <div className="adm-card">
        <h2>Visibilidad</h2>
        <label className="adm-check"><input type="checkbox" checked={v.activo} onChange={e => poner('activo', e.target.checked)} />Visible en la tienda (si lo destildás, queda oculto)</label>
        <label className="adm-check"><input type="checkbox" checked={v.featured} onChange={e => poner('featured', e.target.checked)} />Destacado</label>
        <div style={{ maxWidth: 220, marginTop: 8 }}>
          <Campo etiqueta="Orden" error={errores.orden} ayuda="Los números más chicos salen primero.">
            <input id="pf-orden" className="adm-input" inputMode="numeric" value={v.orden} aria-invalid={!!errores.orden} onChange={e => poner('orden', e.target.value.replace(/[^\d]/g, ''))} />
          </Campo>
        </div>
      </div>
    </fieldset>

    {puedeEditar && <div className="adm-actions" style={{ marginTop: 16 }}>
      <button type="submit" className="button button--pink adm-btn" disabled={guardando || subiendoModelo}>{guardando ? 'Guardando…' : slug ? 'Guardar cambios' : 'Crear producto'}</button>
      {slug && <button type="button" className="button adm-btn adm-btn--ghost" onClick={() => setEliminando(true)}><Trash2 size={16} aria-hidden="true" />Eliminar</button>}
    </div>}
    <CargaGemma mensaje="Guardando el producto…" activa={guardando} />
    {eliminando && <Confirmar titulo={`¿Eliminar ${nombre || 'este producto'}?`} texto="Se borra del catálogo y no se puede deshacer. Las ventas ya hechas conservan sus datos. Si solo querés que no se vea, ocultalo." confirmar="Sí, eliminar" peligro ocupado={ocupadoEliminar} onConfirmar={eliminar} onCancelar={() => !ocupadoEliminar && setEliminando(false)} />}
  </form>
}
