/** @type {import('next').NextConfig} */
// Sitio 100% estático (sin backend todavía): se exporta como HTML a /out.
const nextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true } }
export default nextConfig
