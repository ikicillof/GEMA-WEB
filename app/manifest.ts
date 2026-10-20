import type { MetadataRoute } from 'next'

// Manifiesto de la app web (al "instalarla" o agregarla a la pantalla de inicio). Los íconos viven en public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gemma',
    short_name: 'Gemma',
    description: 'Objetos de diseño impresos en 3D, hechos a pedido y en el color que elegís.',
    lang: 'es-AR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#FF4DA6',
    background_color: '#FFF9F5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Con margen de seguridad: Android recorta el ícono en círculo o cuadrado redondeado y la G no se corta.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
