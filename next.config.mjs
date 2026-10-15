/** @type {import('next').NextConfig} */
// Modo servidor (Netlify con @netlify/plugin-nextjs): ya no se exporta HTML estático.
// Cabeceras de seguridad básicas. No se fija Cross-Origin-Opener-Policy a propósito: rompería la ventana de Google.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
const nextConfig = { images: { unoptimized: true }, async headers() { return [{ source: '/:path*', headers: securityHeaders }] } }
export default nextConfig
