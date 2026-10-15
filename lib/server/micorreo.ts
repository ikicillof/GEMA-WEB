import 'server-only'
import type { Modalidad, OpcionEnvio, Sucursal } from '@/lib/envio'

// Integración con la API MiCorreo de Correo Argentino. Solo servidor: las credenciales nunca llegan al navegador.
// Variables: MICORREO_USER, MICORREO_PASSWORD, MICORREO_CUSTOMER_ID, MICORREO_ORIGIN_CP (CP desde donde despachás)
// y MICORREO_BASE_URL (por defecto el entorno de pruebas apitest). Si falta alguna, o MICORREO_MODO=simulado,
// se responde con datos simulados (marcados con simulado: true) para poder probar todo el checkout.

export class ErrorEnvio extends Error {}

export type Paquete = { pesoGramos: number; altoCm: number; anchoCm: number; largoCm: number }

const BASE_PRUEBA = 'https://apitest.correoargentino.com.ar/micorreo/v1'
const TIMEOUT_MS = 8000

function config() {
  const e = process.env
  const baseUrl = (e.MICORREO_BASE_URL || BASE_PRUEBA).replace(/\/+$/, '')
  if (!baseUrl.startsWith('https://')) throw new ErrorEnvio('MICORREO_BASE_URL tiene que ser https')
  const completo = !!(e.MICORREO_USER && e.MICORREO_PASSWORD && e.MICORREO_CUSTOMER_ID && e.MICORREO_ORIGIN_CP)
  return {
    baseUrl,
    user: e.MICORREO_USER ?? '',
    pass: e.MICORREO_PASSWORD ?? '',
    customerId: e.MICORREO_CUSTOMER_ID ?? '',
    originCp: e.MICORREO_ORIGIN_CP ?? '',
    simulado: !completo || e.MICORREO_MODO === 'simulado',
  }
}

export const envioSimulado = () => config().simulado

// ---- Comunicación con la API ----

let tokenCache: { token: string; hasta: number } | null = null

async function pedir(url: string, init: RequestInit): Promise<unknown> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' })
    if (!res.ok) throw new ErrorEnvio(`MiCorreo respondió ${res.status}`)
    return await res.json()
  } catch (e) {
    if (e instanceof ErrorEnvio) throw e
    throw new ErrorEnvio('MiCorreo no respondió')
  } finally {
    clearTimeout(timer)
  }
}

async function obtenerToken(forzar = false): Promise<string> {
  if (!forzar && tokenCache && tokenCache.hasta > Date.now() + 30_000) return tokenCache.token
  const c = config()
  const basic = Buffer.from(`${c.user}:${c.pass}`).toString('base64')
  const data = (await pedir(`${c.baseUrl}/token`, { method: 'POST', headers: { Authorization: `Basic ${basic}` } })) as { token?: unknown; expires?: unknown }
  if (typeof data.token !== 'string' || !data.token) throw new ErrorEnvio('MiCorreo no entregó token')
  const vence = typeof data.expires === 'string' ? Date.parse(data.expires) : NaN
  tokenCache = { token: data.token, hasta: Number.isFinite(vence) ? vence : Date.now() + 50 * 60_000 }
  return data.token
}

/** Llamada autenticada; si el token venció (401) lo renueva una vez y reintenta. */
async function autenticada(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const c = config()
  const llamar = async (token: string) => pedir(`${c.baseUrl}${ruta}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  try {
    return await llamar(await obtenerToken())
  } catch (e) {
    if (e instanceof ErrorEnvio && e.message.endsWith('401')) return llamar(await obtenerToken(true))
    throw e
  }
}

// ---- Cotización ----

const cacheCotizacion = new Map<string, { hasta: number; opciones: OpcionEnvio[] }>()
const TTL_COTIZACION = 5 * 60_000

const entero = (v: unknown) => { const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? Math.round(v) : NaN; return Number.isFinite(n) ? n : null }

export async function cotizar(cpDestino: string, p: Paquete): Promise<{ simulado: boolean; opciones: OpcionEnvio[] }> {
  const c = config()
  if (c.simulado) return { simulado: true, opciones: cotizarSimulado(cpDestino, p) }

  const clave = [cpDestino, p.pesoGramos, p.altoCm, p.anchoCm, p.largoCm].join('|')
  const guardada = cacheCotizacion.get(clave)
  if (guardada && guardada.hasta > Date.now()) return { simulado: false, opciones: guardada.opciones }

  const data = (await autenticada('/rates', {
    method: 'POST',
    body: JSON.stringify({
      customerId: c.customerId,
      postalCodeOrigin: c.originCp,
      postalCodeDestination: cpDestino,
      dimensions: { weight: p.pesoGramos, height: p.altoCm, width: p.anchoCm, length: p.largoCm },
    }),
  })) as { rates?: unknown }

  // De cada modalidad (D = domicilio, S = sucursal) nos quedamos con la opción más barata.
  const porModalidad = new Map<Modalidad, OpcionEnvio>()
  for (const r of Array.isArray(data.rates) ? (data.rates as Record<string, unknown>[]) : []) {
    const modalidad: Modalidad | null = r.deliveredType === 'D' ? 'domicilio' : r.deliveredType === 'S' ? 'sucursal' : null
    const precio = typeof r.price === 'number' ? Math.round(r.price) : null
    if (!modalidad || precio == null || precio < 0) continue
    const actual = porModalidad.get(modalidad)
    if (!actual || precio < actual.precio) {
      porModalidad.set(modalidad, { modalidad, servicio: typeof r.productName === 'string' ? r.productName : 'Correo Argentino', precio, plazoMin: entero(r.deliveryTimeMin), plazoMax: entero(r.deliveryTimeMax) })
    }
  }
  const opciones = (['domicilio', 'sucursal'] as Modalidad[]).flatMap(m => (porModalidad.has(m) ? [porModalidad.get(m)!] : []))
  if (!opciones.length) throw new ErrorEnvio('MiCorreo no devolvió opciones para ese código postal')
  cacheCotizacion.set(clave, { hasta: Date.now() + TTL_COTIZACION, opciones })
  return { simulado: false, opciones }
}

/** Precios inventados pero coherentes (más peso o más lejos = más caro) para probar sin credenciales. */
function cotizarSimulado(cpDestino: string, p: Paquete): OpcionEnvio[] {
  const zona = Math.abs(parseInt(cpDestino[0], 10) - parseInt((process.env.MICORREO_ORIGIN_CP || '1000')[0], 10))
  const sucursal = 4200 + Math.ceil(p.pesoGramos / 500) * 900 + zona * 450
  return [
    { modalidad: 'domicilio', servicio: 'Correo Argentino Clásico (simulado)', precio: sucursal + 1800, plazoMin: 3 + zona, plazoMax: 6 + zona },
    { modalidad: 'sucursal', servicio: 'Correo Argentino Clásico (simulado)', precio: sucursal, plazoMin: 2 + zona, plazoMax: 5 + zona },
  ]
}

// ---- Sucursales ----

const cacheSucursales = new Map<string, { hasta: number; lista: Sucursal[] }>()
const TTL_SUCURSALES = 10 * 60_000

const texto = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/** Sucursales de la provincia, ordenadas por cercanía numérica del código postal (las 10 más próximas). */
export async function sucursales(provincia: string, cp: string): Promise<{ simulado: boolean; lista: Sucursal[] }> {
  const c = config()
  if (c.simulado) return { simulado: true, lista: sucursalesSimuladas(cp) }

  let todas = cacheSucursales.get(provincia)
  if (!todas || todas.hasta < Date.now()) {
    const data = await autenticada(`/agencies?customerId=${encodeURIComponent(c.customerId)}&provinceCode=${encodeURIComponent(provincia)}`)
    const lista: Sucursal[] = (Array.isArray(data) ? (data as Record<string, unknown>[]) : []).flatMap(a => {
      const dir = ((a.location as Record<string, unknown> | undefined)?.address ?? {}) as Record<string, unknown>
      const servicios = (a.services ?? {}) as Record<string, unknown>
      const codigo = texto(a.code)
      if (!codigo || a.status === 'INACTIVE' || servicios.pickupAvailability === false) return []
      return [{ codigo, nombre: texto(a.name), direccion: `${texto(dir.streetName)} ${texto(dir.streetNumber)}`.trim(), localidad: texto(dir.locality) || texto(dir.city), cp: texto(dir.postalCode) }]
    })
    todas = { hasta: Date.now() + TTL_SUCURSALES, lista }
    cacheSucursales.set(provincia, todas)
  }
  const objetivo = parseInt(cp, 10)
  const distancia = (s: Sucursal) => { const n = parseInt(s.cp, 10); return Number.isFinite(n) ? Math.abs(n - objetivo) : Infinity }
  return { simulado: false, lista: [...todas.lista].sort((a, b) => distancia(a) - distancia(b)).slice(0, 10) }
}

function sucursalesSimuladas(cp: string): Sucursal[] {
  const base = parseInt(cp, 10)
  return [
    ['Centro', 'Av. San Martín 1200', 0], ['Norte', 'Belgrano 450', 3], ['Estación', 'Mitre 87', 5],
    ['Plaza', 'Rivadavia 2300', 8], ['Sur', 'Sarmiento 910', 12],
  ].map(([nombre, direccion, delta], i) => ({
    codigo: `SIM${i + 1}`, nombre: `Sucursal ${nombre} (simulada)`, direccion: String(direccion), localidad: 'Localidad de prueba', cp: String(Math.min(9999, base + Number(delta))).padStart(4, '0'),
  }))
}
