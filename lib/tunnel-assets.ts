// Atlas único con las fotos principales del catálogo para el túnel de /tienda. Se arma en segundo plano apenas carga
// cualquier página (y se precarga el código del túnel), así cuando el usuario navega al catálogo ya está todo listo y
// no se carga ninguna imagen durante el viaje.
export const ATLAS_COLUMNS = 4
export const ATLAS_ROWS = 2

let atlas: { canvas: HTMLCanvasElement; tiles: number } | null = null
let loading: Promise<void> | null = null

export const getTunnelAtlas = () => atlas

export function preloadTunnel(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    const cell = window.matchMedia('(max-width: 700px)').matches ? 128 : 256
    const { portadas } = await fetch('/api/catalogo/portadas').then(r => { if (!r.ok) throw new Error('portadas'); return r.json() as Promise<{ portadas: string[] }> })
    const urls = portadas.filter((u, i, all) => u && all.indexOf(u) === i).slice(0, ATLAS_COLUMNS * ATLAS_ROWS)
    const images = await Promise.all(urls.map(url => new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url
    })))
    const canvas = document.createElement('canvas')
    canvas.width = cell * ATLAS_COLUMNS; canvas.height = cell * ATLAS_ROWS
    const g = canvas.getContext('2d')!
    g.fillStyle = '#FFF9F5'; g.fillRect(0, 0, canvas.width, canvas.height)
    let tiles = 0
    images.forEach((img, i) => {
      if (!img) return
      // "cover": la foto llena el casillero recortando lo que sobra.
      const s = Math.max(cell / img.width, cell / img.height), w = img.width * s, h = img.height * s
      const x = (i % ATLAS_COLUMNS) * cell, y = Math.floor(i / ATLAS_COLUMNS) * cell
      g.save(); g.beginPath(); g.rect(x, y, cell, cell); g.clip()
      g.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h); g.restore()
      tiles = i + 1
    })
    atlas = { canvas, tiles }
    await import('@/components/tunnel-scene') // el código del túnel (three + shaders) también queda en caché
  })().catch(() => { loading = null })
  return loading
}
