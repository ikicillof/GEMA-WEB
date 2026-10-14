// Contenido de la página Quiénes somos: TODO lo que se puede querer cambiar está acá (textos de los globos, valores y números).
// Lo marcado como PROVISORIO es un valor de relleno para reemplazar.

export type GemiExpression = 'happy' | 'wink' | 'surprised' | 'relaxed'
export type StoryArt = 'colores' | 'rincon' | 'puerta' | 'impresora' | 'piezas'

// 1. Gemi cuenta la historia: un globo por parada del scroll, con la expresión de Gemi y la ilustración del costado derecho.
export const STORY: { text: string; mood: GemiExpression; art: StoryArt; provisional?: boolean }[] = [
  { text: '¡Hola! Soy Gemi, la guardiana del color de Gemma.', mood: 'happy', art: 'colores' },
  { text: 'Gemma nació para hacer que cada rincón brille. No porque tenga luces, sino porque tenga personalidad.', mood: 'relaxed', art: 'rincon' },
  // PROVISORIO: reemplazar por la historia real de cómo empezó Gemma.
  { text: 'Todo empezó con una impresora, una idea y muchas ganas de ponerle color a cada rincón de casa.', mood: 'surprised', art: 'puerta', provisional: true },
  { text: 'Diseñamos e imprimimos en 3D objetos con formas, colores y personalidad, hechos a pedido.', mood: 'wink', art: 'impresora' },
  { text: 'Queremos que cuando veas una pieza nuestra digas: eso es tan Gemma.', mood: 'happy', art: 'piezas' },
]

// 2. Los 5 valores como objetos 3D (la forma la dibuja components/values-scene.tsx según `shape`).
export type ValueShape = 'star' | 'spiral' | 'heart' | 'drop' | 'house'
export const VALUES_TITLE = 'Lo que nos mueve'
export const VALUES: { name: string; meaning: string; color: string; shape: ValueShape }[] = [
  { name: 'Alegría', meaning: 'El corazón emocional de la marca.', color: '#FFD93D', shape: 'star' },
  { name: 'Creatividad', meaning: 'Formas, color y ese toque que no esperabas.', color: '#6D28D9', shape: 'spiral' },
  { name: 'Cercanía', meaning: 'Como una amiga compartiendo un hallazgo.', color: '#FF4DA6', shape: 'heart' },
  { name: 'Diseño', meaning: 'Respaldo al estilo Kitsch, Pop Art y Memphis: lo que nos separa de cualquier objeto genérico.', color: '#00E6D2', shape: 'drop' },
  { name: 'Hogar', meaning: 'La razón por la que todo esto tiene sentido.', color: '#FFB4D8', shape: 'house' },
]

// 3. Gemma en números: cada contador sube desde 0 hasta `value` al entrar en pantalla.
export const STATS_TITLE = 'Gemma en números'
export const STATS: { value: number; suffix: string; label: string; color: string; provisional?: boolean }[] = [
  { value: 500, suffix: '+', label: 'Piezas impresas', color: '#FF4DA6', provisional: true }, // PROVISORIO
  { value: 13, suffix: '', label: 'Colores para elegir', color: '#6D28D9' }, // los 13 colores estándar del catálogo
  { value: 2000, suffix: '+', label: 'Horas de impresión', color: '#00E6D2', provisional: true }, // PROVISORIO
  { value: 10000, suffix: '+', label: 'Metros de filamento', color: '#FFD93D', provisional: true }, // PROVISORIO
]
