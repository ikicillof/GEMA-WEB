// `invalidate()` global de R3F recorre todos los canvas; durante unos instantes después de destruir uno (las escenas lejanas se
// desmontan para liberar la GPU) falla al tocar el contexto ya liberado. Se absorbe el error y se reintenta en el próximo cuadro,
// cuando el canvas destruido ya salió de la lista.
//
// R3F (y three.js con él) NO se importa acá de forma estática: pesa ~680 KB y este archivo lo usa el home desde el primer momento.
// Se importa recién cuando la primera escena 3D ya se descargó (`r3fListo`); antes de eso no hay ningún canvas que redibujar.
type Invalidar = () => void
let invalidar: Invalidar | null = null
let r3f = false
let pidiendo = false

/** La llama cargaDiferida() cuando se descargó una escena 3D (y con ella R3F). */
export function r3fListo() { r3f = true }

export function invalidateSafe() {
  if (!r3f) return
  if (!invalidar) {
    if (!pidiendo) { pidiendo = true; import('@react-three/fiber').then(m => { invalidar = m.invalidate as Invalidar }).catch(() => { pidiendo = false }) }
    return
  }
  try { invalidar() } catch { requestAnimationFrame(() => { try { invalidar?.() } catch { /* nada más que redibujar */ } }) }
}
