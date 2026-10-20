// Tiempos del desfile 3D del home. Viven acá (y no en journey-scene.tsx) para que el home pueda leerlos sin importar three.js:
// journey-scene.tsx se descarga recién cuando el navegador está libre.
const WINDOW = 0.7, STAGGER = 0.15, HEAD_START = 0.08 // el primero ya viene entrando apenas empieza el scroll
// Para el snap: la línea de tiempo del desfile (el objeto i recorre la pantalla con t = (p - i·STAGGER) / WINDOW + HEAD_START).
export const PARADE_TIMING = { WINDOW, STAGGER, HEAD_START }
