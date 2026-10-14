import { invalidate } from '@react-three/fiber'

// `invalidate()` global de R3F recorre todos los canvas; durante unos instantes después de destruir uno (las escenas lejanas se
// desmontan para liberar la GPU) falla al tocar el contexto ya liberado. Se absorbe el error y se reintenta en el próximo cuadro,
// cuando el canvas destruido ya salió de la lista.
export function invalidateSafe() {
  try { invalidate() } catch { requestAnimationFrame(() => { try { invalidate() } catch { /* nada más que redibujar */ } }) }
}
