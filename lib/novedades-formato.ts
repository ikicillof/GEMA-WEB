// Formato básico de las novedades. NUNCA se acepta HTML: la persona escribe texto con tres marcas y el servidor arma el mail.
//   **negrita**        [texto del link](https://direccion)        una línea en blanco = párrafo nuevo, un salto de línea = salto
// Sin acceso a secretos ni a datos: lo usan el servidor (plantilla del mail) y el navegador (ayuda del panel).

export type Nodo =
  | { t: 'texto'; v: string }
  | { t: 'negrita'; v: string }
  | { t: 'link'; v: string; href: string }
  | { t: 'salto' }
export type Parrafo = Nodo[]

export const MAX_MENSAJE = 5000

// Solo links http(s), sin espacios ni comillas ni paréntesis dentro de la dirección.
const MARCAS = /\*\*([^*\n][^*\n]{0,300}?)\*\*|\[([^\]\n]{1,200})\]\((https?:\/\/[^\s()<>"']{1,500})\)/g

function enLinea(linea: string): Nodo[] {
  const nodos: Nodo[] = []
  let desde = 0
  const marcas = new RegExp(MARCAS.source, 'g')
  let m: RegExpExecArray | null
  while ((m = marcas.exec(linea)) !== null) {
    const i = m.index
    if (i > desde) nodos.push({ t: 'texto', v: linea.slice(desde, i) })
    if (m[1] !== undefined) nodos.push({ t: 'negrita', v: m[1] })
    else nodos.push({ t: 'link', v: m[2], href: m[3] })
    desde = i + m[0].length
  }
  if (desde < linea.length) nodos.push({ t: 'texto', v: linea.slice(desde) })
  return nodos
}

/** Texto escrito por la persona -> párrafos de nodos. Lo que no es una marca reconocida queda como texto común. */
export function parsearMensaje(texto: string): Parrafo[] {
  return texto
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(bloque => bloque.trim())
    .filter(Boolean)
    .map(bloque => bloque.split('\n').flatMap((linea, i): Nodo[] => [...(i > 0 ? [{ t: 'salto' } as Nodo] : []), ...enLinea(linea)]))
}
