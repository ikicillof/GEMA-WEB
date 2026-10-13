// Línea de tiempo de la sección 2 del home: "cómo nace una pieza" (impresora 3D). Progreso p de 0 a 1 sobre su animación.
// La comparten la escena 3D (cámara, filamento, capas), el componente de la sección (textos y menú de colores) y el home
// (paradas del snap), y vive aparte para que el home no arrastre three.js al paquete inicial.
export const PJ = {
  FILAMENT: [0.2, 0.36], // el hilo se desenrolla hasta la boquilla
  HEAT: [0.3, 0.42], // la boquilla se calienta
  PRINT: [0.44, 0.78], // la capa sube de 0 a 1 (el plano de corte)
  DONE: [0.78, 1], // la pieza se despega, salta y queda girando; la impresora se desvanece
  // Paradas del snap: la bobina con el menú de colores · la impresora completa · la pieza terminada. Sin parada a mitad de
  // impresión: mientras se imprime el scroll sigue libre.
  STOPS: [0.08, 0.44, 0.98],
  // Textos: [aparece, plena, empieza a irse, se fue]. El primero ("Elegí tu color") comparte ventana con el menú de colores.
  TEXTS: [[0.01, 0.05, 0.17, 0.21], [0.47, 0.52, 0.74, 0.78], [0.86, 0.91, 1.01, 1.02]],
} as const

// Color del Perro Globo si nadie eligió ninguno: el rosa Gemma. Lo usan la impresora y el cuarto de la sección 3.
export const DEFAULT_DOG_COLOR = '#FF4DA6'
