'use client'

import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react'
import { CargaGemma } from '@/components/carga-gemma'
import { useAdmin } from './admin-shell'

type Firma = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: 'image' | 'raw'; allowedFormats?: string }

const MAX_IMAGEN = 10 * 1024 * 1024
const MAX_MODELO = 25 * 1024 * 1024
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']

/** Miniatura liviana para las fotos que viven en Cloudinary; el resto (fotos del sitio) se muestra tal cual. */
export const mini = (url: string) =>
  url.includes('res.cloudinary.com') && url.includes('/image/upload/') ? url.replace('/image/upload/', '/image/upload/c_fill,w_300,h_300,q_auto,f_auto/') : url

/**
 * Subida directa a Cloudinary. El servidor firma los parámetros (carpeta, formatos y hora) y el navegador sube el archivo
 * con esa firma: el API Secret nunca sale del servidor. Devuelve la dirección segura del archivo subido.
 */
export function useSubida() {
  const { api } = useAdmin()
  return useCallback(async (archivo: File, tipo: 'imagen' | 'modelo'): Promise<string> => {
    if (tipo === 'imagen') {
      if (!TIPOS_IMAGEN.includes(archivo.type)) throw new Error(`«${archivo.name}»: usá fotos JPG, PNG o WebP.`)
      if (archivo.size > MAX_IMAGEN) throw new Error(`«${archivo.name}» pesa más de 10 MB. Achicala y probá de nuevo.`)
    } else {
      if (!/\.glb$/i.test(archivo.name)) throw new Error('El modelo 3D tiene que ser un archivo .glb.')
      if (archivo.size > MAX_MODELO) throw new Error('El modelo 3D pesa más de 25 MB.')
    }
    const f = await api<Firma>('/api/admin/uploads/firma', { method: 'POST', body: JSON.stringify({ tipo }) })
    if (!f.ok) throw new Error(f.cuerpo.error || 'No pudimos preparar la subida.')
    const { cloudName, apiKey, timestamp, signature, folder, resourceType, allowedFormats } = f.cuerpo
    const datos = new FormData()
    datos.append('file', archivo)
    datos.append('api_key', apiKey)
    datos.append('timestamp', String(timestamp))
    datos.append('signature', signature)
    datos.append('folder', folder)
    if (allowedFormats) datos.append('allowed_formats', allowedFormats)
    let res: Response
    try { res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: datos }) } catch { throw new Error('No hay conexión. Revisá tu internet y probá de nuevo.') }
    const cuerpo = await res.json().catch(() => ({}))
    if (!res.ok || typeof cuerpo.secure_url !== 'string') throw new Error(cuerpo?.error?.message ? `No se pudo subir «${archivo.name}»: ${cuerpo.error.message}` : `No se pudo subir «${archivo.name}».`)
    return cuerpo.secure_url
  }, [api])
}

/**
 * Fotos del producto: subir (varias a la vez), ver la vista previa, ordenar arrastrando (dedo o mouse) o con las flechas,
 * y quitar. La primera es la portada. Mientras suben no se puede reordenar.
 */
export function Fotos({ valor, onCambio, max = 12 }: { valor: string[]; onCambio: (v: string[]) => void; max?: number }) {
  const subir = useSubida()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origen, setOrigen] = useState<number | null>(null)
  const [destino, setDestino] = useState<number | null>(null)
  const actual = useRef(valor)
  actual.current = valor

  async function elegidos(archivos: FileList | null) {
    if (!archivos?.length) return
    setError(null)
    setSubiendo(true)
    let lista = actual.current
    const errores: string[] = []
    for (const archivo of Array.from(archivos)) {
      if (lista.length >= max) { errores.push(`Máximo ${max} fotos.`); break }
      try { lista = [...lista, await subir(archivo, 'imagen')]; onCambio(lista) } catch (e) { errores.push((e as Error).message) }
    }
    setSubiendo(false)
    if (errores.length) setError(errores.join(' '))
  }

  function mover(de: number, a: number) {
    if (de === a || a < 0 || a >= valor.length) return
    const copia = [...valor]
    const [x] = copia.splice(de, 1)
    copia.splice(a, 0, x)
    onCambio(copia)
  }
  const soltar = () => { if (origen !== null && destino !== null) mover(origen, destino); setOrigen(null); setDestino(null) }

  return <div>
    {error && <p className="adm-aviso adm-aviso--error" role="alert">{error}</p>}
    <ul className="adm-fotos" aria-label="Fotos del producto">
      {valor.map((url, i) =>
        <li key={`${url}-${i}`} data-foto={i}
          className={`adm-foto${origen === i ? ' adm-foto--arrastrando' : ''}${origen !== null && destino === i && origen !== i ? ' adm-foto--destino' : ''}`}
          onPointerDown={e => { if (subiendo || (e.target as HTMLElement).closest('button')) return; e.currentTarget.setPointerCapture(e.pointerId); setOrigen(i); setDestino(i) }}
          onPointerMove={e => {
            if (origen === null) return
            const n = Number(document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-foto]')?.getAttribute('data-foto'))
            if (Number.isInteger(n)) setDestino(n)
          }}
          onPointerUp={soltar}
          onPointerCancel={() => { setOrigen(null); setDestino(null) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mini(url)} alt={`Foto ${i + 1}${i === 0 ? ' (portada)' : ''}`} draggable={false} />
          <span className="adm-foto-num">{i === 0 ? 'Portada' : i + 1}</span>
          <button type="button" className="adm-foto-quitar" aria-label={`Quitar la foto ${i + 1}`} disabled={subiendo} onClick={() => onCambio(valor.filter((_, j) => j !== i))}><X size={16} aria-hidden="true" /></button>
          <div className="adm-foto-mover">
            <button type="button" aria-label={`Mover la foto ${i + 1} a la izquierda`} disabled={subiendo || i === 0} onClick={() => mover(i, i - 1)}><ArrowLeft size={16} aria-hidden="true" /></button>
            <button type="button" aria-label={`Mover la foto ${i + 1} a la derecha`} disabled={subiendo || i === valor.length - 1} onClick={() => mover(i, i + 1)}><ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </li>)}
      {valor.length < max && <li>
        <label className="adm-subir">
          <ImagePlus size={24} aria-hidden="true" />
          <span>{valor.length ? 'Agregar fotos' : 'Subir fotos'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={subiendo} onChange={e => { void elegidos(e.target.files); e.target.value = '' }} />
        </label>
      </li>}
    </ul>
    <p className="adm-sub">La primera es la portada. Arrastrá las fotos (o usá las flechas) para cambiar el orden. JPG, PNG o WebP, hasta 10 MB cada una.</p>
    <CargaGemma mensaje="Subiendo las fotos…" activa={subiendo} compacta />
  </div>
}
