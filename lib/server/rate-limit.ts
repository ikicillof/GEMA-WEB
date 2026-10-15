import 'server-only'

// Límite simple por IP en memoria. En Netlify cada instancia serverless lleva su propio contador,
// así que frena ráfagas y abuso casual pero no reemplaza un límite global (Cloudflare, etc.).
const ventanas = new Map<string, { desde: number; cuenta: number }>()

export function ipDe(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local'
  )
}

export function limitar(clave: string, max: number, ventanaMs = 60_000): boolean {
  const ahora = Date.now()
  if (ventanas.size > 5000) ventanas.forEach((v, k) => { if (ahora - v.desde > ventanaMs) ventanas.delete(k) })
  const actual = ventanas.get(clave)
  if (!actual || ahora - actual.desde > ventanaMs) { ventanas.set(clave, { desde: ahora, cuenta: 1 }); return true }
  actual.cuenta++
  return actual.cuenta <= max
}
