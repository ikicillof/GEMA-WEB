// Reglas de negocio de los productos del panel (sin acceso a Firestore).

type Medidas = { pesoGramos: number | null; altoCm: number | null; anchoCm: number | null; largoCm: number | null }
const CAMPOS = ['pesoGramos', 'altoCm', 'anchoCm', 'largoCm'] as const

/**
 * ¿Quedan como provisorias las medidas del producto?
 *  - Faltan datos (peso o alguna medida): sí.
 *  - Están completas: se apaga si es un producto nuevo, si alguna medida cambió respecto de lo guardado
 *    o si la persona tildó "son las medidas reales". Si no, siguen provisorias.
 */
export function medidasProvisorias(previo: FirebaseFirestore.DocumentData | null, nuevo: Medidas, confirmadas?: boolean): boolean {
  if (CAMPOS.some(c => nuevo[c] == null)) return true
  if (!previo) return false
  if (previo.medidasProvisorias !== true) return false
  return !(confirmadas === true || CAMPOS.some(c => previo[c] !== nuevo[c]))
}
