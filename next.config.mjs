/** @type {import('next').NextConfig} */
// Modo servidor (Netlify con @netlify/plugin-nextjs): ya no se exporta HTML estático.
const nextConfig = { images: { unoptimized: true } }
export default nextConfig
