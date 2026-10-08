# Tienda online Gemma — Storefront MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el storefront (tienda pública) de Gemma sobre Next.js 16, contra un catálogo estático tipado, con carrito persistente, checkout con pago (Mercado Pago Checkout Pro + transferencia/efectivo) y las páginas legales/SEO requeridas — todo fiel a `DESIGN.md` y a la dirección de home aprobada.

**Architecture:** Server Components async solo para fetch de datos (catálogo, no soportan unit test en esta versión de Next.js); toda la composición visual vive en componentes síncronos testeables que reciben los datos ya resueltos como props. Toda lógica de negocio (precio transferencia, envío, carrito, armado de pedido, Mercado Pago, JSON-LD) vive en funciones puras de `src/lib/`, inyectando sus dependencias externas (repos, fetch) para poder testear sin red ni base de datos real. El catálogo se lee hoy de `src/data/products.json` a través de un adaptador (`src/lib/catalog.ts`) que es el único punto que una futura migración a Supabase/CMS necesita tocar.

**Tech Stack:** Next.js 16 (App Router, Turbopack por defecto, Cache Components desactivado), TypeScript estricto, Tailwind CSS v4 (tokens vía `@theme` en CSS), `next/font/google` (Poppins), Vitest + React Testing Library + jsdom, `@supabase/ssr` (auth + persistencia de pedidos), Mercado Pago Checkout Pro (integración manual vía `fetch`, sin SDK).

**Spec:**
- `docs/superpowers/specs/2026-10-07-tienda-online-mvp-design.md` (spec de producto/arquitectura aprobada)
- `DESIGN.md` (sistema de diseño) y `.impeccable/surfaces/home.md` (dirección de home elegida: "A. Hero con Gemi, antes/después")

## Global Constraints

- Next.js 16: App Router, Turbopack por defecto. `cookies()`, `headers()`, `params`, `searchParams` son **siempre asíncronos** — todo acceso usa `await`.
- El archivo de interceptación de requests se llama `proxy.ts` (no `middleware.ts` — renombrado en v16).
- Cache Components **desactivado** (`cacheComponents: false` / no se habilita en el scaffold) — se usa el modelo de caching tradicional de Next.js.
- Tailwind v4: sin `tailwind.config.js`; los tokens se definen en un bloque `@theme` dentro de `src/app/globals.css`, copiados 1:1 de `DESIGN.md`.
- Tipografía: Poppins SemiBold (600) vía `next/font/google`, cargada una sola vez en el root layout.
- Paleta fija de `DESIGN.md`: `--color-bg #0F0F10` siempre de fondo; nunca más de 3 colores dominantes (sin contar fondo/texto) en una misma pantalla.
- Precio por transferencia = `precio * 0.9`, **siempre derivado**, nunca un campo editable a mano.
- Envío: tarifas fijas por zona (sin integración con API de Correo Argentino), incluye una zona de retiro a $0.
- Sin control de stock por unidad: cada color de producto es `disponible` o `agotado` (booleano), no un contador.
- Checkout: navegar y armar el carrito **no** requiere cuenta; el login/registro se exige únicamente al llegar al paso de pago.
- El panel de administración (CRUD de productos/pedidos/zonas) **no** es parte de este plan — ver "Fuera de alcance" al final.
- El visor 3D de producto está **explícitamente fuera del alcance del MVP v1** según la spec aprobada (sección 10), aunque el prompt de scaffold lo liste como tarea 8 "opcional" — ver nota al final.

## Review Focus

- **Carrito vacío en checkout:** entrar a `/checkout` sin productos en el carrito no debe crear un pedido ni mostrar un total de $0 — debe redirigir a `/carrito`. (Tarea 14)
- **Cantidad inválida en el carrito:** bajar la cantidad de un ítem a 0 o negativo debe eliminarlo, no dejar un ítem con cantidad inválida. (Tarea 11)
- **Producto agotado después de agregado al carrito:** si un color se agota después de que la clienta ya lo agregó, el checkout debe detectarlo y pedir que lo quite antes de pagar, no cobrarlo en silencio. (Tarea 14)
- **Slug de producto/categoría inexistente:** una URL como `/producto/no-existe` o `/categoria/no-existe` debe responder 404 (`notFound()`), no romper con un error no controlado. (Tareas 10, 12)
- **Webhook de Mercado Pago duplicado:** recibir la misma notificación de pago dos veces no debe duplicar el pedido ni aplicar el cambio de estado dos veces de forma inconsistente — debe ser idempotente. (Tarea 17)

---

## Task 1: Scaffold del proyecto Next.js 16 + TypeScript + Tailwind v4 + Vitest

**Files:**
- Create: todo lo generado por `create-next-app` dentro de `src/`, `next.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`
- Create: `vitest.config.mts`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `formatCurrencyARS(value: number): string` — usado por todas las tareas que muestran precios (4, 6, 8, 12, 13).

El proyecto ya tiene archivos (`DESIGN.md`, `PRODUCT.md`, `docs/`, `prompts/`, `public/brand/`, `.impeccable/`, `.git/`) — `create-next-app` no debe correr apuntando a `.` porque puede negarse a escribir sobre una carpeta no vacía. Se genera en una carpeta temporal hermana y se mueve lo necesario.

- [ ] **Step 1: Generar el scaffold en una carpeta temporal**

Run (desde la carpeta **padre** del proyecto, no desde adentro):
```bash
npx create-next-app@latest gemma-scaffold-tmp \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-cache-components \
  --use-npm --disable-git --yes
```
Expected: se crea `../gemma-scaffold-tmp` con `src/app`, `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `public/`.

- [ ] **Step 2: Mover lo generado al proyecto, sin pisar lo existente**

Run (desde la raíz del proyecto):
```bash
mv ../gemma-scaffold-tmp/src .
mv ../gemma-scaffold-tmp/next.config.ts .
mv ../gemma-scaffold-tmp/tsconfig.json .
mv ../gemma-scaffold-tmp/package.json .
mv ../gemma-scaffold-tmp/package-lock.json .
mv ../gemma-scaffold-tmp/eslint.config.mjs .
mv ../gemma-scaffold-tmp/postcss.config.mjs .
mv ../gemma-scaffold-tmp/.gitignore .
# el public/ generado solo trae íconos de ejemplo (next.svg, vercel.svg, etc.)
# y un favicon — no pisa public/brand/, que ya existe:
cp ../gemma-scaffold-tmp/public/favicon.ico public/favicon.ico 2>/dev/null || true
rm -rf ../gemma-scaffold-tmp
```
Expected: la raíz del proyecto ahora tiene `src/`, `next.config.ts`, `tsconfig.json`, `package.json`, junto con los archivos preexistentes (`DESIGN.md`, `PRODUCT.md`, `docs/`, `prompts/`, `public/brand/`, `.impeccable/`).

- [ ] **Step 3: Verificar que el scaffold compila**

Run: `npm run build`
Expected: build exitoso (puede haber una página `app/page.tsx` placeholder de `create-next-app`, se reemplaza en la Tarea 8).

- [ ] **Step 4: Instalar el toolchain de testing**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths
```

- [ ] **Step 5: Configurar Vitest**

Create `vitest.config.mts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Escribir el test de la primera utilidad real (no un smoke test descartable)**

Create `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatCurrencyARS } from './format'

describe('formatCurrencyARS', () => {
  it('formats a whole ARS amount with thousands separators', () => {
    const result = formatCurrencyARS(15000)
    expect(result).toContain('15.000')
    expect(result).toMatch(/\$/)
  })

  it('rounds to whole pesos (no decimals shown)', () => {
    const result = formatCurrencyARS(8990.5)
    expect(result).not.toMatch(/[.,]\d{2}$/)
  })

  it('formats zero correctly', () => {
    expect(formatCurrencyARS(0)).toContain('0')
  })
})
```

- [ ] **Step 7: Correr el test y verificar que falla**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL — `src/lib/format.ts` no existe.

- [ ] **Step 8: Implementar `formatCurrencyARS`**

Create `src/lib/format.ts`:
```ts
export function formatCurrencyARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}
```

- [ ] **Step 9: Correr el test y verificar que pasa**

Run: `npm test -- src/lib/format.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 + TypeScript + Tailwind v4 + Vitest"
```

---

## Task 2: Design tokens (Tailwind `@theme`) + tipografía Poppins

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Test: `src/app/design-tokens.test.ts`

**Interfaces:**
- Produces: clases de utilidad Tailwind `bg-bg`, `text-text`, `bg-primary`, `text-primary`, `bg-secondary`, `bg-accent-cool`, `bg-accent-warm`, `bg-rest`, `rounded-sm|md|lg|full`, `shadow-float|glow-primary|sticker` — consumidas por todas las tareas de UI (6, 7, 8, 10, 12, 13).
- Produces: variable CSS `--font-poppins` aplicada vía `className` en `<html>`, consumida por todo el árbol.

- [ ] **Step 1: Escribir el test de contenido de tokens**

Create `src/app/design-tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf-8')

describe('design tokens in globals.css', () => {
  const requiredTokens = [
    '--color-bg: #0F0F10',
    '--color-primary: #FF4DA6',
    '--color-secondary: #6D28D9',
    '--color-accent-cool: #00E6D2',
    '--color-accent-warm: #FFD93D',
    '--color-rest: #FFB4DB',
    '--color-text: #FFFFFF',
    '--radius-sm: 12px',
    '--radius-md: 20px',
    '--radius-lg: 32px',
    '--radius-full: 999px',
  ]

  it.each(requiredTokens)('defines token %s', (token) => {
    expect(css).toContain(token)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- src/app/design-tokens.test.ts`
Expected: FAIL — los tokens todavía no están en `globals.css`.

- [ ] **Step 3: Escribir `globals.css` con el bloque `@theme` de DESIGN.md**

Modify `src/app/globals.css` (reemplaza el contenido generado por `create-next-app`):
```css
@import 'tailwindcss';

@theme {
  --color-bg: #0F0F10;
  --color-primary: #FF4DA6;
  --color-secondary: #6D28D9;
  --color-accent-cool: #00E6D2;
  --color-accent-warm: #FFD93D;
  --color-rest: #FFB4DB;
  --color-text: #FFFFFF;

  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 32px;
  --radius-full: 999px;

  --shadow-float: 0 4px 16px rgba(15, 15, 16, 0.4);
  --shadow-glow-primary: 0 8px 28px rgba(255, 77, 166, 0.25);
  --shadow-sticker: 0 6px 18px rgba(0, 0, 0, 0.3);
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- src/app/design-tokens.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Cargar Poppins con `next/font/google` en el root layout**

Modify `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Gemma — Hacemos que cada rincón brille',
  description:
    'Objetos de diseño de impresión 3D para el hogar. Lámparas, calendarios, estantes y más, con la personalidad de Gemma.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

Add to the `@theme` block in `globals.css` (so `font-sans` resolves to Poppins):
```css
  --font-sans: var(--font-poppins), sans-serif;
```

- [ ] **Step 6: Verificar visualmente**

Run: `npm run dev`, abrir `http://localhost:3000`
Expected: la página placeholder se ve con fondo negro grafito y tipografía Poppins (sin errores en consola).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: design tokens (Tailwind @theme) and Poppins font"
```

---

## Task 3: Capa de datos del catálogo (tipos + fixture + adaptador)

**Files:**
- Create: `src/types/product.ts`
- Create: `src/data/products.json`
- Create: `src/data/categories.json`
- Create: `src/lib/catalog.ts`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- Produces: `type Product`, `type ColorVariant`, `type Category` (`src/types/product.ts`)
- Produces: `getAllProducts(): Product[]`, `getProductBySlug(slug: string): Product | undefined`, `getProductsByCategory(categorySlug: string): Product[]`, `getAllCategories(): Category[]`, `getCategoryBySlug(slug: string): Category | undefined` (`src/lib/catalog.ts`) — consumidas por las Tareas 8, 9, 10, 12, 20.

- [ ] **Step 1: Definir los tipos**

Create `src/types/product.ts`:
```ts
export type ColorVariant = {
  name: string
  hex: string
  photo?: string
  available: boolean
}

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  categorySlug: string
  price: number
  colors: ColorVariant[]
  photos: string[]
  available: boolean
  model3d?: string
}

export type Category = {
  slug: string
  name: string
  order: number
}
```

- [ ] **Step 2: Crear el fixture de productos**

Create `src/data/categories.json`:
```json
[
  { "slug": "lamparas", "name": "Lámparas", "order": 1 },
  { "slug": "organizadores", "name": "Organizadores", "order": 2 },
  { "slug": "calendarios", "name": "Calendarios", "order": 3 }
]
```

Create `src/data/products.json`:
```json
[
  {
    "id": "lumalee",
    "slug": "lampara-lumalee",
    "name": "Lámpara Lumalee",
    "description": "Una lámpara con forma de nube que le pone color a cualquier mesa de luz. Le cambia la cara al rincón más apagado de tu cuarto.",
    "categorySlug": "lamparas",
    "price": 32000,
    "colors": [
      { "name": "Rosa Gemma", "hex": "#FF4DA6", "available": true },
      { "name": "Turquesa", "hex": "#00E6D2", "available": true },
      { "name": "Amarillo", "hex": "#FFD93D", "available": false }
    ],
    "photos": ["/products/lumalee-1.jpg", "/products/lumalee-2.jpg"],
    "available": true
  },
  {
    "id": "calendario-perpetuo",
    "slug": "calendario-perpetuo-gemma",
    "name": "Calendario Perpetuo Gemma",
    "description": "Calendario de escritorio que se usa todos los años. Gomita, redondeado, con un corazón amarillo de regalo.",
    "categorySlug": "calendarios",
    "price": 14500,
    "colors": [
      { "name": "Violeta Oscuro", "hex": "#6D28D9", "available": true },
      { "name": "Rosa Pastel", "hex": "#FFB4DB", "available": true }
    ],
    "photos": ["/products/calendario-1.jpg"],
    "available": true
  },
  {
    "id": "porta-llaves-ondas",
    "slug": "porta-llaves-ondas",
    "name": "Porta Llaves Ondas",
    "description": "Para la entrada de tu casa: ondas gorditas que sostienen las llaves y suman color apenas abrís la puerta.",
    "categorySlug": "organizadores",
    "price": 9800,
    "colors": [{ "name": "Rosa Gemma", "hex": "#FF4DA6", "available": false }],
    "photos": ["/products/porta-llaves-1.jpg"],
    "available": false
  }
]
```

- [ ] **Step 3: Escribir los tests del adaptador**

Create `src/lib/catalog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
  getAllCategories,
  getCategoryBySlug,
} from './catalog'

describe('catalog adapter', () => {
  it('returns all products from the fixture', () => {
    expect(getAllProducts().length).toBe(3)
  })

  it('finds a product by slug', () => {
    const product = getProductBySlug('lampara-lumalee')
    expect(product?.name).toBe('Lámpara Lumalee')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getProductBySlug('no-existe')).toBeUndefined()
  })

  it('filters products by category', () => {
    const lamps = getProductsByCategory('lamparas')
    expect(lamps).toHaveLength(1)
    expect(lamps[0].slug).toBe('lampara-lumalee')
  })

  it('returns an empty array for an unknown category', () => {
    expect(getProductsByCategory('no-existe')).toEqual([])
  })

  it('returns all categories ordered', () => {
    const categories = getAllCategories()
    expect(categories.map((c) => c.slug)).toEqual([
      'lamparas',
      'organizadores',
      'calendarios',
    ])
  })

  it('finds a category by slug', () => {
    expect(getCategoryBySlug('lamparas')?.name).toBe('Lámparas')
  })

  it('returns undefined for an unknown category slug', () => {
    expect(getCategoryBySlug('no-existe')).toBeUndefined()
  })
})
```

- [ ] **Step 4: Correr los tests y verificar que fallan**

Run: `npm test -- src/lib/catalog.test.ts`
Expected: FAIL — `src/lib/catalog.ts` no existe.

- [ ] **Step 5: Implementar el adaptador**

Create `src/lib/catalog.ts`:
```ts
import productsData from '@/data/products.json'
import categoriesData from '@/data/categories.json'
import type { Product, Category } from '@/types/product'

const products = productsData as Product[]
const categories = categoriesData as Category[]

export function getAllProducts(): Product[] {
  return products
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug)
}

export function getAllCategories(): Category[] {
  return [...categories].sort((a, b) => a.order - b.order)
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug)
}
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `npm test -- src/lib/catalog.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: typed catalog data layer (products.json + adapter)"
```

---

## Task 4: Precio por transferencia

**Files:**
- Create: `src/lib/pricing.ts`
- Test: `src/lib/pricing.test.ts`

**Interfaces:**
- Produces: `TRANSFER_DISCOUNT_RATE: number`, `computeTransferPrice(price: number): number` — consumida por Tareas 6, 12, 13, 16, 17, 20.

- [ ] **Step 1: Escribir los tests**

Create `src/lib/pricing.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeTransferPrice } from './pricing'

describe('computeTransferPrice', () => {
  it('applies a 10% discount', () => {
    expect(computeTransferPrice(10000)).toBe(9000)
  })

  it('rounds to the nearest whole peso', () => {
    expect(computeTransferPrice(9999)).toBe(8999)
  })

  it('returns 0 for a price of 0', () => {
    expect(computeTransferPrice(0)).toBe(0)
  })

  it('throws for a negative price', () => {
    expect(() => computeTransferPrice(-100)).toThrow()
  })

  it('throws for a non-finite price', () => {
    expect(() => computeTransferPrice(NaN)).toThrow()
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- src/lib/pricing.test.ts`
Expected: FAIL — `src/lib/pricing.ts` no existe.

- [ ] **Step 3: Implementar**

Create `src/lib/pricing.ts`:
```ts
export const TRANSFER_DISCOUNT_RATE = 0.1

export function computeTransferPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`computeTransferPrice: invalid price ${price}`)
  }
  return Math.round(price * (1 - TRANSFER_DISCOUNT_RATE))
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- src/lib/pricing.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: computeTransferPrice (10% off, always derived)"
```

---

## Task 5: Zonas de envío

**Files:**
- Create: `src/data/shipping-zones.json`
- Create: `src/lib/shipping.ts`
- Test: `src/lib/shipping.test.ts`

**Interfaces:**
- Produces: `type ShippingZone`, `getShippingZones(): ShippingZone[]`, `getShippingZoneById(id: string): ShippingZone | undefined`, `calculateShippingTotal(zoneId: string): number` — consumida por Tareas 13, 14, 15, 16.

- [ ] **Step 1: Crear el fixture de zonas**

Create `src/data/shipping-zones.json`:
```json
[
  { "id": "caba", "name": "CABA", "rate": 3500, "order": 1 },
  { "id": "resto-pais", "name": "Resto del país (Correo Argentino)", "rate": 5500, "order": 2 },
  { "id": "retiro-vicente-lopez", "name": "Retiro en Vicente López", "rate": 0, "order": 3 }
]
```

- [ ] **Step 2: Escribir los tests**

Create `src/lib/shipping.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  getShippingZones,
  getShippingZoneById,
  calculateShippingTotal,
} from './shipping'

describe('shipping zones', () => {
  it('returns zones ordered', () => {
    const zones = getShippingZones()
    expect(zones.map((z) => z.id)).toEqual([
      'caba',
      'resto-pais',
      'retiro-vicente-lopez',
    ])
  })

  it('finds a zone by id', () => {
    expect(getShippingZoneById('caba')?.rate).toBe(3500)
  })

  it('returns undefined for an unknown zone id', () => {
    expect(getShippingZoneById('no-existe')).toBeUndefined()
  })

  it('calculates the shipping total for a paid zone', () => {
    expect(calculateShippingTotal('resto-pais')).toBe(5500)
  })

  it('calculates 0 for the pickup zone', () => {
    expect(calculateShippingTotal('retiro-vicente-lopez')).toBe(0)
  })

  it('throws for an unknown zone id', () => {
    expect(() => calculateShippingTotal('no-existe')).toThrow()
  })
})
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `npm test -- src/lib/shipping.test.ts`
Expected: FAIL — `src/lib/shipping.ts` no existe.

- [ ] **Step 4: Implementar**

Create `src/lib/shipping.ts`:
```ts
import shippingZonesData from '@/data/shipping-zones.json'

export type ShippingZone = {
  id: string
  name: string
  rate: number
  order: number
}

const zones = shippingZonesData as ShippingZone[]

export function getShippingZones(): ShippingZone[] {
  return [...zones].sort((a, b) => a.order - b.order)
}

export function getShippingZoneById(id: string): ShippingZone | undefined {
  return zones.find((z) => z.id === id)
}

export function calculateShippingTotal(zoneId: string): number {
  const zone = getShippingZoneById(zoneId)
  if (!zone) {
    throw new Error(`calculateShippingTotal: unknown zone ${zoneId}`)
  }
  return zone.rate
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test -- src/lib/shipping.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: fixed-rate shipping zones"
```

---

## Task 6: Primitivas de UI (Botón, ProductCard, Badge de transferencia, Banners de confianza)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TransferPriceBadge.tsx`
- Create: `src/components/ui/ProductCard.tsx`
- Create: `src/components/ui/TrustBanner.tsx`
- Create: `src/components/ui/TrustBannerRow.tsx`
- Test: `src/components/ui/Button.test.tsx`
- Test: `src/components/ui/TransferPriceBadge.test.tsx`
- Test: `src/components/ui/ProductCard.test.tsx`
- Test: `src/components/ui/TrustBannerRow.test.tsx`

**Interfaces:**
- Consumes: `computeTransferPrice` (Tarea 4), `formatCurrencyARS` (Tarea 1), `type Product` (Tarea 3)
- Produces: `<Button variant="primary"|"secondary">`, `<TransferPriceBadge price={number}>`, `<ProductCard product={Product}>`, `<TrustBanner icon={ReactNode} label={string} tone="rest"|"cool"|"warm">`, `<TrustBannerRow items={{icon, label, tone}[]}>` — consumidos por Tareas 7, 8, 10.

- [ ] **Step 1: Test de `Button`**

Create `src/components/ui/Button.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and applies the primary pill styling', () => {
    render(<Button variant="primary">Ver productos</Button>)
    const button = screen.getByRole('button', { name: 'Ver productos' })
    expect(button).toHaveClass('rounded-full')
    expect(button).toHaveClass('bg-primary')
  })

  it('renders the secondary variant with an outline', () => {
    render(<Button variant="secondary">Ver más</Button>)
    const button = screen.getByRole('button', { name: 'Ver más' })
    expect(button).toHaveClass('border-secondary')
  })

  it('respects the disabled prop', () => {
    render(<Button variant="primary" disabled>Agotado</Button>)
    expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run y verificar fail**

Run: `npm test -- src/components/ui/Button.test.tsx`
Expected: FAIL — el componente no existe.

- [ ] **Step 3: Implementar `Button`**

Create `src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: 'primary' | 'secondary'
}

export function Button({ variant, className = '', ...props }: ButtonProps) {
  const base =
    'rounded-full px-7 py-3.5 font-semibold transition-shadow disabled:opacity-40 disabled:cursor-not-allowed'
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-text hover:shadow-[var(--shadow-glow-primary)]'
      : 'bg-transparent border-2 border-secondary text-text'

  return <button className={`${base} ${variantClass} ${className}`} {...props} />
}
```

- [ ] **Step 4: Run y verificar pass**

Run: `npm test -- src/components/ui/Button.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Test de `TransferPriceBadge`**

Create `src/components/ui/TransferPriceBadge.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransferPriceBadge } from './TransferPriceBadge'

describe('TransferPriceBadge', () => {
  it('shows the derived transfer price, not the raw price', () => {
    render(<TransferPriceBadge price={10000} />)
    expect(screen.getByText(/9\.000/)).toBeInTheDocument()
  })

  it('mentions "transferencia" in the label', () => {
    render(<TransferPriceBadge price={10000} />)
    expect(screen.getByText(/transferencia/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run y verificar fail, luego implementar**

Run: `npm test -- src/components/ui/TransferPriceBadge.test.tsx` → FAIL

Create `src/components/ui/TransferPriceBadge.tsx`:
```tsx
import { computeTransferPrice } from '@/lib/pricing'
import { formatCurrencyARS } from '@/lib/format'

export function TransferPriceBadge({ price }: { price: number }) {
  const transferPrice = computeTransferPrice(price)
  return (
    <span className="inline-flex items-center rounded-full bg-rest px-3 py-1 text-xs font-semibold text-bg shadow-[var(--shadow-sticker)]">
      {formatCurrencyARS(transferPrice)} x transferencia 💸
    </span>
  )
}
```

Run: `npm test -- src/components/ui/TransferPriceBadge.test.tsx` → PASS (2 tests)

- [ ] **Step 7: Test de `ProductCard`**

Create `src/components/ui/ProductCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: 'Una nube con luz.',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [
    { name: 'Rosa Gemma', hex: '#FF4DA6', available: true },
    { name: 'Amarillo', hex: '#FFD93D', available: false },
  ],
  photos: ['/products/lumalee-1.jpg'],
  available: true,
}

describe('ProductCard', () => {
  it('shows the product name and both prices', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
    expect(screen.getByText(/28\.800/)).toBeInTheDocument()
  })

  it('links to the product detail page', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/producto/lampara-lumalee'
    )
  })

  it('renders a swatch per color, dimming unavailable ones', () => {
    render(<ProductCard product={product} />)
    const swatches = screen.getAllByTestId('color-swatch')
    expect(swatches).toHaveLength(2)
    expect(swatches[1]).toHaveClass('opacity-40')
  })
})
```

- [ ] **Step 8: Run y verificar fail, luego implementar**

Run: `npm test -- src/components/ui/ProductCard.test.tsx` → FAIL

Create `src/components/ui/ProductCard.tsx`:
```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types/product'
import { formatCurrencyARS } from '@/lib/format'
import { TransferPriceBadge } from './TransferPriceBadge'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.slug}`}
      className="block rounded-lg bg-[#17171A] p-4 shadow-[var(--shadow-float)]"
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg">
        <Image
          src={product.photos[0]}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <h3 className="mb-1 font-semibold">{product.name}</h3>
      <p className="mb-2 text-sm">{formatCurrencyARS(product.price)}</p>
      <TransferPriceBadge price={product.price} />
      <div className="mt-3 flex gap-2">
        {product.colors.map((color) => (
          <span
            key={color.name}
            data-testid="color-swatch"
            title={color.name}
            className={`h-5 w-5 rounded-full border border-text/30 ${
              color.available ? '' : 'opacity-40'
            }`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </Link>
  )
}
```

Run: `npm test -- src/components/ui/ProductCard.test.tsx` → PASS (3 tests)

- [ ] **Step 9: Test de `TrustBannerRow`**

Create `src/components/ui/TrustBannerRow.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustBannerRow } from './TrustBannerRow'

describe('TrustBannerRow', () => {
  it('renders one chip per item, never more than 3 distinct tones', () => {
    render(
      <TrustBannerRow
        items={[
          { icon: '📦', label: 'Envíos a todo el país', tone: 'rest' },
          { icon: '🏠', label: 'Comprá sin salir de tu casa', tone: 'cool' },
          { icon: '💳', label: 'Hasta 12 cuotas', tone: 'warm' },
          { icon: '🔒', label: 'Compra segura', tone: 'rest' },
        ]}
      />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Compra segura')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run y verificar fail, luego implementar**

Run: `npm test -- src/components/ui/TrustBannerRow.test.tsx` → FAIL

Create `src/components/ui/TrustBanner.tsx`:
```tsx
import type { ReactNode } from 'react'

type Tone = 'rest' | 'cool' | 'warm'

const toneClass: Record<Tone, string> = {
  rest: 'bg-rest text-bg',
  cool: 'bg-accent-cool text-bg',
  warm: 'bg-accent-warm text-bg',
}

export function TrustBanner({
  icon,
  label,
  tone,
}: {
  icon: ReactNode
  label: string
  tone: Tone
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--shadow-sticker)] ${toneClass[tone]}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </li>
  )
}
```

Create `src/components/ui/TrustBannerRow.tsx`:
```tsx
import { TrustBanner } from './TrustBanner'

type TrustBannerItem = {
  icon: React.ReactNode
  label: string
  tone: 'rest' | 'cool' | 'warm'
}

export function TrustBannerRow({ items }: { items: TrustBannerItem[] }) {
  return (
    <ul className="flex gap-3 overflow-x-auto py-2 md:flex-wrap md:overflow-visible">
      {items.map((item) => (
        <TrustBanner key={item.label} {...item} />
      ))}
    </ul>
  )
}
```

Run: `npm test -- src/components/ui/TrustBannerRow.test.tsx` → PASS (1 test)

- [ ] **Step 11: Correr toda la suite y commit**

Run: `npm test`
Expected: todos los tests pasan.

```bash
git add -A
git commit -m "feat: UI primitives (Button, TransferPriceBadge, ProductCard, TrustBanner)"
```

---

## Task 7: Header, Footer y layout raíz

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/layout/Header.test.tsx`
- Test: `src/components/layout/Footer.test.tsx`

**Interfaces:**
- Produces: `<Header cartCount={number}>`, `<Footer>` — montados en el root layout en todas las páginas.

- [ ] **Step 1: Test de `Header`**

Create `src/components/layout/Header.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('links the logo to home and shows nav items', () => {
    render(<Header cartCount={0} />)
    expect(screen.getByRole('link', { name: /gemma/i })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getByRole('link', { name: /categorías/i })).toBeInTheDocument()
  })

  it('shows the cart count badge when there are items', () => {
    render(<Header cartCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides the cart count badge when the cart is empty', () => {
    render(<Header cartCount={0} />)
    expect(screen.queryByTestId('cart-count')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/layout/Header.test.tsx` → FAIL

Create `src/components/layout/Header.tsx`:
```tsx
import Link from 'next/link'

export function Header({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-4 py-3 shadow-[var(--shadow-float)]">
      <Link href="/" className="font-semibold">
        Gemma
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/categoria/lamparas">Categorías</Link>
        <Link href="/carrito" className="relative" aria-label="Carrito">
          🛍
          {cartCount > 0 && (
            <span
              data-testid="cart-count"
              className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px]"
            >
              {cartCount}
            </span>
          )}
        </Link>
      </nav>
    </header>
  )
}
```

Run: `npm test -- src/components/layout/Header.test.tsx` → PASS (3 tests)

- [ ] **Step 3: Test de `Footer`**

Create `src/components/layout/Footer.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Footer', () => {
  it('links to the retraction button page (legal requirement in Argentina)', () => {
    render(<Footer />)
    expect(
      screen.getByRole('link', { name: /botón de arrepentimiento/i })
    ).toHaveAttribute('href', '/arrepentimiento')
  })

  it('links to shipping/payments and FAQ info pages', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /envíos y pagos/i })).toHaveAttribute(
      'href',
      '/envios-y-pagos'
    )
    expect(screen.getByRole('link', { name: /preguntas frecuentes/i })).toHaveAttribute(
      'href',
      '/faq'
    )
  })

  it('shows the contact email', () => {
    render(<Footer />)
    expect(screen.getByText('somosgemma.ar@gmail.com')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run (fail) → implementar**

Run: `npm test -- src/components/layout/Footer.test.tsx` → FAIL

Create `src/components/layout/Footer.tsx`:
```tsx
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-secondary/30 px-4 py-8 text-sm">
      <nav className="mb-4 flex flex-col gap-2">
        <Link href="/contacto">Contacto</Link>
        <Link href="/envios-y-pagos">Envíos y pagos</Link>
        <Link href="/faq">Preguntas frecuentes</Link>
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
      </nav>
      <p>somosgemma.ar@gmail.com</p>
      <p className="mt-1 text-text/60">
        Hacemos que cada rincón brille 💫
      </p>
    </footer>
  )
}
```

Run: `npm test -- src/components/layout/Footer.test.tsx` → PASS (3 tests)

- [ ] **Step 5: Montar Header y Footer en el root layout**

Modify `src/app/layout.tsx` (agregar dentro de `<body>`, alrededor de `{children}`):
```tsx
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
// ...
return (
  <html lang="es" className={poppins.variable}>
    <body className="font-sans">
      <Header cartCount={0} />
      {children}
      <Footer />
    </body>
  </html>
)
```
(El `cartCount={0}` fijo se reemplaza por el valor real del carrito en la Tarea 11.)

- [ ] **Step 6: Verificar visualmente y commit**

Run: `npm run dev` → confirmar que Header y Footer aparecen en la página placeholder.

```bash
git add -A
git commit -m "feat: Header and Footer mounted in root layout"
```

---

## Task 8: Home page (dirección "Hero con Gemi, antes/después")

**Files:**
- Create: `src/components/home/Hero.tsx`
- Create: `src/components/home/FeaturedProducts.tsx`
- Create: `src/components/home/HomeView.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/home/HomeView.test.tsx`

**Interfaces:**
- Consumes: `getAllProducts` (Tarea 3), `<ProductCard>`, `<TrustBannerRow>` (Tarea 6)
- Produces: `<HomeView featuredProducts={Product[]}>` — la única pieza de la home testeable (la página en sí es un Server Component async, ver nota de arquitectura).

- [ ] **Step 1: Test de `HomeView`**

Create `src/components/home/HomeView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeView } from './HomeView'
import type { Product } from '@/types/product'

const products: Product[] = [
  {
    id: 'lumalee',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: 'Una nube con luz.',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: true }],
    photos: ['/products/lumalee-1.jpg'],
    available: true,
  },
]

describe('HomeView', () => {
  it('shows the brand hero copy and the main CTA', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText(/hacemos que cada rincón brille/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver productos/i })).toHaveAttribute(
      'href',
      '/categoria/lamparas'
    )
  })

  it('shows the trust banners', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText(/envíos a todo el país/i)).toBeInTheDocument()
  })

  it('renders the featured products grid', () => {
    render(<HomeView featuredProducts={products} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/home/HomeView.test.tsx` → FAIL

Create `src/components/home/Hero.tsx` (dirección aprobada: split hero, Gemi señalando el rincón — ver `.impeccable/surfaces/home.md`):
```tsx
import Link from 'next/link'

export function Hero() {
  return (
    <section className="grid gap-6 px-4 py-10 md:grid-cols-2 md:items-center md:px-10">
      <div>
        <h1 className="mb-3 text-3xl font-semibold md:text-4xl">
          Hacemos que cada rincón brille 💫
        </h1>
        <p className="mb-6 text-text/80">
          Mirá lo que encontré para ese rincón que mirás todos los días y no
          ves. Objetos con personalidad, no organizadores genéricos.
        </p>
        <Link
          href="/categoria/lamparas"
          className="inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-text hover:shadow-[var(--shadow-glow-primary)]"
        >
          Ver productos
        </Link>
      </div>
      {/* Escena ilustrada "rincón de casa" con Gemi — placeholder visual hasta
          contar con la ilustración real (ver Unresolved decisions en el
          surface brief de home). */}
      <div
        data-testid="hero-scene"
        className="aspect-square rounded-lg bg-[#17171A] shadow-[var(--shadow-float)]"
      />
    </section>
  )
}
```

Create `src/components/home/FeaturedProducts.tsx`:
```tsx
import type { Product } from '@/types/product'
import { ProductCard } from '@/components/ui/ProductCard'

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section className="px-4 py-8 md:px-10">
      <h2 className="mb-4 text-xl font-semibold">Lo más pedido</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
```

Create `src/components/home/HomeView.tsx`:
```tsx
import type { Product } from '@/types/product'
import { Hero } from './Hero'
import { FeaturedProducts } from './FeaturedProducts'
import { TrustBannerRow } from '@/components/ui/TrustBannerRow'

export function HomeView({ featuredProducts }: { featuredProducts: Product[] }) {
  return (
    <main>
      <Hero />
      <div className="px-4 md:px-10">
        <TrustBannerRow
          items={[
            { icon: '📦', label: 'Envíos a todo el país', tone: 'rest' },
            { icon: '🏠', label: 'Comprá sin salir de tu casa', tone: 'cool' },
            { icon: '💳', label: 'Hasta 12 cuotas', tone: 'warm' },
            { icon: '🔒', label: 'Compra segura', tone: 'rest' },
          ]}
        />
      </div>
      <FeaturedProducts products={featuredProducts} />
    </main>
  )
}
```

Run: `npm test -- src/components/home/HomeView.test.tsx` → PASS (3 tests)

- [ ] **Step 3: Conectar la página real (thin async Server Component)**

Modify `src/app/page.tsx`:
```tsx
import { getAllProducts } from '@/lib/catalog'
import { HomeView } from '@/components/home/HomeView'

export default async function Page() {
  const featuredProducts = getAllProducts().slice(0, 3)
  return <HomeView featuredProducts={featuredProducts} />
}
```

- [ ] **Step 4: Verificar visualmente y commit**

Run: `npm run dev` → confirmar que la home muestra el hero, los banners y los productos destacados.

```bash
git add -A
git commit -m "feat: home page (Hero con Gemi direction, featured products, trust banners)"
```

---

## Task 9: Lógica de filtrado y orden del listado

**Files:**
- Create: `src/lib/catalog-filters.ts`
- Test: `src/lib/catalog-filters.test.ts`

**Interfaces:**
- Consumes: `type Product` (Tarea 3)
- Produces: `type SortOption = 'price-asc' | 'price-desc' | 'name-asc'`, `sortProducts(products: Product[], sort: SortOption): Product[]` — consumida por la Tarea 10.

- [ ] **Step 1: Escribir los tests**

Create `src/lib/catalog-filters.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sortProducts } from './catalog-filters'
import type { Product } from '@/types/product'

const base: Omit<Product, 'id' | 'slug' | 'name' | 'price'> = {
  description: '',
  categorySlug: 'lamparas',
  colors: [],
  photos: [],
  available: true,
}

const products: Product[] = [
  { ...base, id: '1', slug: 'b', name: 'Beta', price: 20000 },
  { ...base, id: '2', slug: 'a', name: 'Alfa', price: 10000 },
  { ...base, id: '3', slug: 'c', name: 'Charlie', price: 30000 },
]

describe('sortProducts', () => {
  it('sorts by price ascending', () => {
    const sorted = sortProducts(products, 'price-asc')
    expect(sorted.map((p) => p.id)).toEqual(['2', '1', '3'])
  })

  it('sorts by price descending', () => {
    const sorted = sortProducts(products, 'price-desc')
    expect(sorted.map((p) => p.id)).toEqual(['3', '1', '2'])
  })

  it('sorts by name ascending', () => {
    const sorted = sortProducts(products, 'name-asc')
    expect(sorted.map((p) => p.id)).toEqual(['2', '1', '3'])
  })

  it('does not mutate the input array', () => {
    const original = [...products]
    sortProducts(products, 'price-asc')
    expect(products).toEqual(original)
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/lib/catalog-filters.test.ts` → FAIL

Create `src/lib/catalog-filters.ts`:
```ts
import type { Product } from '@/types/product'

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc'

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price)
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
  }
}
```

- [ ] **Step 3: Run (pass) → commit**

Run: `npm test -- src/lib/catalog-filters.test.ts` → PASS (4 tests)

```bash
git add -A
git commit -m "feat: sortProducts for category listing"
```

---

## Task 10: Página de listado por categoría

**Files:**
- Create: `src/components/catalog/SortSelect.tsx`
- Create: `src/components/catalog/CategoryListingView.tsx`
- Create: `src/app/categoria/[slug]/page.tsx`
- Test: `src/components/catalog/CategoryListingView.test.tsx`

**Interfaces:**
- Consumes: `getProductsByCategory`, `getCategoryBySlug` (Tarea 3), `sortProducts`, `type SortOption` (Tarea 9), `<ProductCard>` (Tarea 6)
- Produces: `<CategoryListingView category={Category} products={Product[]}>`

- [ ] **Step 1: Test de `CategoryListingView`**

Create `src/components/catalog/CategoryListingView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryListingView } from './CategoryListingView'
import type { Product, Category } from '@/types/product'

const category: Category = { slug: 'lamparas', name: 'Lámparas', order: 1 }
const products: Product[] = [
  {
    id: '1',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: '',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [],
    photos: ['/products/lumalee-1.jpg'],
    available: true,
  },
]

describe('CategoryListingView', () => {
  it('shows the category name as the title', () => {
    render(<CategoryListingView category={category} products={products} />)
    expect(screen.getByRole('heading', { name: 'Lámparas' })).toBeInTheDocument()
  })

  it('renders a card per product', () => {
    render(<CategoryListingView category={category} products={products} />)
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
  })

  it('shows an empty state when there are no products', () => {
    render(<CategoryListingView category={category} products={[]} />)
    expect(screen.getByText(/todavía no hay productos/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/catalog/CategoryListingView.test.tsx` → FAIL

Create `src/components/catalog/SortSelect.tsx`:
```tsx
'use client'

import type { SortOption } from '@/lib/catalog-filters'

export function SortSelect({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <select
      aria-label="Ordenar por"
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-md bg-[#17171A] px-3 py-2 text-sm"
    >
      <option value="price-asc">Precio: menor a mayor</option>
      <option value="price-desc">Precio: mayor a menor</option>
      <option value="name-asc">Nombre: A-Z</option>
    </select>
  )
}
```

Create `src/components/catalog/CategoryListingView.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { Product, Category } from '@/types/product'
import { ProductCard } from '@/components/ui/ProductCard'
import { SortSelect } from './SortSelect'
import { sortProducts, type SortOption } from '@/lib/catalog-filters'

export function CategoryListingView({
  category,
  products,
}: {
  category: Category
  products: Product[]
}) {
  const [sort, setSort] = useState<SortOption>('price-asc')

  if (products.length === 0) {
    return (
      <main className="px-4 py-10 md:px-10">
        <h1 className="mb-4 text-2xl font-semibold">{category.name}</h1>
        <p>Todavía no hay productos en esta categoría.</p>
      </main>
    )
  }

  const sorted = sortProducts(products, sort)

  return (
    <main className="px-4 py-10 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {sorted.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  )
}
```

Run: `npm test -- src/components/catalog/CategoryListingView.test.tsx` → PASS (3 tests)

- [ ] **Step 3: Conectar la página real, con 404 para categoría inexistente**

Create `src/app/categoria/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { getCategoryBySlug, getProductsByCategory } from '@/lib/catalog'
import { CategoryListingView } from '@/components/catalog/CategoryListingView'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const products = getProductsByCategory(slug)

  return <CategoryListingView category={category} products={products} />
}
```

- [ ] **Step 4: Verificar el caso 404 manualmente**

Run: `npm run dev`, visitar `http://localhost:3000/categoria/no-existe`
Expected: página 404 de Next.js, no un error no controlado. (Este es el input de "Review Focus" sobre slugs inexistentes.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: category listing page with sort (404 for unknown category)"
```

---

## Task 11: Estado del carrito (reducer + persistencia + contexto)

**Files:**
- Create: `src/lib/cart/cart-types.ts`
- Create: `src/lib/cart/cart-reducer.ts`
- Create: `src/lib/cart/cart-storage.ts`
- Create: `src/components/cart/CartProvider.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/lib/cart/cart-reducer.test.ts`
- Test: `src/lib/cart/cart-storage.test.ts`

**Interfaces:**
- Produces: `type CartItem`, `type CartState`, `type CartAction`, `cartReducer(state, action): CartState` (`cart-reducer.ts`)
- Produces: `loadCart(): CartState`, `saveCart(state): void` (`cart-storage.ts`)
- Produces: `<CartProvider>`, `useCart(): { state: CartState; addItem; removeItem; updateQuantity; clear }` (`CartProvider.tsx`) — consumido por Tareas 7 (cart count), 12, 13, 14.

- [ ] **Step 1: Tipos del carrito**

Create `src/lib/cart/cart-types.ts`:
```ts
export type CartItem = {
  productId: string
  slug: string
  name: string
  color: string
  unitPrice: number
  quantity: number
  photo: string
}

export type CartState = {
  items: CartItem[]
}

export type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; productId: string; color: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; color: string; quantity: number }
  | { type: 'CLEAR' }

export const EMPTY_CART: CartState = { items: [] }
```

- [ ] **Step 2: Tests del reducer**

Create `src/lib/cart/cart-reducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cartReducer } from './cart-reducer'
import { EMPTY_CART, type CartItem } from './cart-types'

const lumalee: CartItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

describe('cartReducer', () => {
  it('adds a new item', () => {
    const next = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    expect(next.items).toHaveLength(1)
  })

  it('merges quantity when adding the same product+color again', () => {
    const once = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const twice = cartReducer(once, { type: 'ADD_ITEM', item: lumalee })
    expect(twice.items).toHaveLength(1)
    expect(twice.items[0].quantity).toBe(2)
  })

  it('removes an item', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const removed = cartReducer(withItem, {
      type: 'REMOVE_ITEM',
      productId: 'lumalee',
      color: 'Rosa Gemma',
    })
    expect(removed.items).toHaveLength(0)
  })

  it('updates quantity', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const updated = cartReducer(withItem, {
      type: 'UPDATE_QUANTITY',
      productId: 'lumalee',
      color: 'Rosa Gemma',
      quantity: 5,
    })
    expect(updated.items[0].quantity).toBe(5)
  })

  it('removes the item when quantity is updated to 0 or less', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    const updated = cartReducer(withItem, {
      type: 'UPDATE_QUANTITY',
      productId: 'lumalee',
      color: 'Rosa Gemma',
      quantity: 0,
    })
    expect(updated.items).toHaveLength(0)
  })

  it('clears the cart', () => {
    const withItem = cartReducer(EMPTY_CART, { type: 'ADD_ITEM', item: lumalee })
    expect(cartReducer(withItem, { type: 'CLEAR' })).toEqual(EMPTY_CART)
  })
})
```

- [ ] **Step 3: Run (fail) → implementar**

Run: `npm test -- src/lib/cart/cart-reducer.test.ts` → FAIL

Create `src/lib/cart/cart-reducer.ts`:
```ts
import type { CartState, CartAction } from './cart-types'

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.productId === action.item.productId && i.color === action.item.color
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + action.item.quantity } : i
          ),
        }
      }
      return { items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(
          (i) => !(i.productId === action.productId && i.color === action.color)
        ),
      }
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, {
          type: 'REMOVE_ITEM',
          productId: action.productId,
          color: action.color,
        })
      }
      return {
        items: state.items.map((i) =>
          i.productId === action.productId && i.color === action.color
            ? { ...i, quantity: action.quantity }
            : i
        ),
      }
    }
    case 'CLEAR':
      return { items: [] }
  }
}
```

- [ ] **Step 4: Run (pass)**

Run: `npm test -- src/lib/cart/cart-reducer.test.ts` → PASS (6 tests)

- [ ] **Step 5: Tests de persistencia**

Create `src/lib/cart/cart-storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadCart, saveCart } from './cart-storage'
import { EMPTY_CART } from './cart-types'

beforeEach(() => {
  localStorage.clear()
})

describe('cart storage', () => {
  it('returns an empty cart when nothing is stored', () => {
    expect(loadCart()).toEqual(EMPTY_CART)
  })

  it('round-trips a saved cart', () => {
    const state = { items: [{ productId: 'lumalee', slug: 'lampara-lumalee', name: 'Lámpara Lumalee', color: 'Rosa Gemma', unitPrice: 32000, quantity: 2, photo: '/products/lumalee-1.jpg' }] }
    saveCart(state)
    expect(loadCart()).toEqual(state)
  })

  it('returns an empty cart if the stored value is corrupted', () => {
    localStorage.setItem('gemma_cart_v1', 'not-json')
    expect(loadCart()).toEqual(EMPTY_CART)
  })
})
```

- [ ] **Step 6: Run (fail) → implementar**

Run: `npm test -- src/lib/cart/cart-storage.test.ts` → FAIL

Create `src/lib/cart/cart-storage.ts`:
```ts
import { EMPTY_CART, type CartState } from './cart-types'

const STORAGE_KEY = 'gemma_cart_v1'

export function loadCart(): CartState {
  if (typeof window === 'undefined') return EMPTY_CART
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_CART
    return JSON.parse(raw) as CartState
  } catch {
    return EMPTY_CART
  }
}

export function saveCart(state: CartState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota excedida);
    // el carrito sigue funcionando en memoria para esta sesión.
  }
}
```

- [ ] **Step 7: Run (pass)**

Run: `npm test -- src/lib/cart/cart-storage.test.ts` → PASS (3 tests)

- [ ] **Step 8: Contexto de carrito**

Create `src/components/cart/CartProvider.tsx`:
```tsx
'use client'

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { cartReducer } from '@/lib/cart/cart-reducer'
import { loadCart, saveCart } from '@/lib/cart/cart-storage'
import { EMPTY_CART, type CartItem } from '@/lib/cart/cart-types'

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, color: string) => void
  updateQuantity: (productId: string, color: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART, loadCart)

  useEffect(() => {
    saveCart(state)
  }, [state])

  const value: CartContextValue = {
    items: state.items,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (productId, color) => dispatch({ type: 'REMOVE_ITEM', productId, color }),
    updateQuantity: (productId, color, quantity) =>
      dispatch({ type: 'UPDATE_QUANTITY', productId, color, quantity }),
    clear: () => dispatch({ type: 'CLEAR' }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
```

- [ ] **Step 9: Montar `CartProvider` en el root layout y usar el contador real en `Header`**

Modify `src/app/layout.tsx`:
```tsx
import { CartProvider } from '@/components/cart/CartProvider'
import { HeaderWithCartCount } from '@/components/layout/HeaderWithCartCount'
// ...
<body className="font-sans">
  <CartProvider>
    <HeaderWithCartCount />
    {children}
    <Footer />
  </CartProvider>
</body>
```

Create `src/components/layout/HeaderWithCartCount.tsx` (puente cliente entre `useCart` y el `Header` ya testeado en la Tarea 7, sin tocar su interfaz):
```tsx
'use client'

import { useCart } from '@/components/cart/CartProvider'
import { Header } from './Header'

export function HeaderWithCartCount() {
  const { items } = useCart()
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return <Header cartCount={cartCount} />
}
```

- [ ] **Step 10: Verificar visualmente y commit**

Run: `npm run dev` → confirmar que no hay errores de hidratación por el `CartProvider`.

```bash
git add -A
git commit -m "feat: persistent cart state (reducer + localStorage + context)"
```

---

## Task 12: Ficha de producto

**Files:**
- Create: `src/components/product/ColorVariantPicker.tsx`
- Create: `src/components/product/ProductDetailView.tsx`
- Create: `src/app/producto/[slug]/page.tsx`
- Test: `src/components/product/ProductDetailView.test.tsx`

**Interfaces:**
- Consumes: `getProductBySlug` (Tarea 3), `computeTransferPrice` (Tarea 4), `useCart` (Tarea 11), `<TransferPriceBadge>` (Tarea 6)
- Produces: `<ProductDetailView product={Product}>`

- [ ] **Step 1: Test de `ProductDetailView`**

Create `src/components/product/ProductDetailView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductDetailView } from './ProductDetailView'
import { CartProvider, useCart } from '@/components/cart/CartProvider'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: 'Una nube con luz.',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [
    { name: 'Rosa Gemma', hex: '#FF4DA6', available: true },
    { name: 'Amarillo', hex: '#FFD93D', available: false },
  ],
  photos: ['/products/lumalee-1.jpg', '/products/lumalee-2.jpg'],
  available: true,
}

function CartSpy({ onItems }: { onItems: (count: number) => void }) {
  const { items } = useCart()
  onItems(items.reduce((sum, i) => sum + i.quantity, 0))
  return null
}

describe('ProductDetailView', () => {
  it('shows the name, both prices, and the gallery', () => {
    render(
      <CartProvider>
        <ProductDetailView product={product} />
      </CartProvider>
    )
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    expect(screen.getByText(/32\.000/)).toBeInTheDocument()
    expect(screen.getByText(/28\.800/)).toBeInTheDocument()
  })

  it('disables "agregar al carrito" when the selected color is unavailable', () => {
    render(
      <CartProvider>
        <ProductDetailView product={product} />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Amarillo' }))
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeDisabled()
  })

  it('adds the selected color and quantity to the cart', () => {
    let count = 0
    render(
      <CartProvider>
        <ProductDetailView product={product} />
        <CartSpy onItems={(c) => (count = c)} />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/product/ProductDetailView.test.tsx` → FAIL

Create `src/components/product/ColorVariantPicker.tsx`:
```tsx
'use client'

import type { ColorVariant } from '@/types/product'

export function ColorVariantPicker({
  colors,
  selected,
  onSelect,
}: {
  colors: ColorVariant[]
  selected: ColorVariant
  onSelect: (color: ColorVariant) => void
}) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex gap-2">
      {colors.map((color) => (
        <button
          key={color.name}
          type="button"
          role="radio"
          aria-checked={selected.name === color.name}
          aria-label={color.name}
          onClick={() => onSelect(color)}
          className={`h-8 w-8 rounded-full border-2 ${
            selected.name === color.name ? 'border-primary' : 'border-text/30'
          } ${color.available ? '' : 'opacity-40'}`}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  )
}
```

Create `src/components/product/ProductDetailView.tsx`:
```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Product } from '@/types/product'
import { formatCurrencyARS } from '@/lib/format'
import { TransferPriceBadge } from '@/components/ui/TransferPriceBadge'
import { Button } from '@/components/ui/Button'
import { ColorVariantPicker } from './ColorVariantPicker'
import { useCart } from '@/components/cart/CartProvider'

export function ProductDetailView({ product }: { product: Product }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0])
  const { addItem } = useCart()

  return (
    <main className="grid gap-6 px-4 py-10 md:grid-cols-2 md:px-10">
      <div className="grid gap-3">
        {product.photos.map((photo) => (
          <div key={photo} className="relative aspect-square overflow-hidden rounded-lg">
            <Image src={photo} alt={product.name} fill className="object-cover" />
          </div>
        ))}
      </div>
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mb-4 text-text/80">{product.description}</p>
        <p className="mb-2 text-lg">{formatCurrencyARS(product.price)}</p>
        <div className="mb-4">
          <TransferPriceBadge price={product.price} />
        </div>
        <div className="mb-6">
          <ColorVariantPicker
            colors={product.colors}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />
        </div>
        <Button
          variant="primary"
          disabled={!selectedColor.available}
          onClick={() =>
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              color: selectedColor.name,
              unitPrice: product.price,
              quantity: 1,
              photo: product.photos[0],
            })
          }
        >
          {selectedColor.available ? 'Agregar al carrito' : 'Agotado en este color'}
        </Button>
      </div>
    </main>
  )
}
```

Run: `npm test -- src/components/product/ProductDetailView.test.tsx` → PASS (3 tests)

- [ ] **Step 3: Conectar la página real, con 404 para slug inexistente**

Create `src/app/producto/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/catalog'
import { ProductDetailView } from '@/components/product/ProductDetailView'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return <ProductDetailView product={product} />
}
```

- [ ] **Step 4: Verificar manualmente y commit**

Run: `npm run dev` → probar `/producto/lampara-lumalee` (funciona) y `/producto/no-existe` (404).

```bash
git add -A
git commit -m "feat: product detail page (gallery, color variants, transfer price)"
```

---

## Task 13: Página de carrito

**Files:**
- Create: `src/components/cart/CartItemRow.tsx`
- Create: `src/components/cart/CartView.tsx`
- Create: `src/app/carrito/page.tsx`
- Test: `src/components/cart/CartView.test.tsx`

**Interfaces:**
- Consumes: `useCart` (Tarea 11), `computeTransferPrice` (Tarea 4), `formatCurrencyARS` (Tarea 1)
- Produces: `<CartView>` (lee el carrito directamente de `useCart`, no recibe props — es la vista completa del carrito)

- [ ] **Step 1: Test de `CartView`**

Create `src/components/cart/CartView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartView } from './CartView'
import { CartProvider, useCart } from '@/components/cart/CartProvider'

function Seed() {
  const { addItem } = useCart()
  addItem({
    productId: 'lumalee',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    color: 'Rosa Gemma',
    unitPrice: 32000,
    quantity: 2,
    photo: '/products/lumalee-1.jpg',
  })
  return null
}

describe('CartView', () => {
  it('shows the empty state when there are no items', () => {
    render(
      <CartProvider>
        <CartView />
      </CartProvider>
    )
    expect(screen.getByText(/todavía no agregaste nada/i)).toBeInTheDocument()
  })

  it('shows items and the computed total', () => {
    render(
      <CartProvider>
        <Seed />
        <CartView />
      </CartProvider>
    )
    expect(screen.getByText('Lámpara Lumalee')).toBeInTheDocument()
    // 2 x $32.000 = $64.000
    expect(screen.getByText(/64\.000/)).toBeInTheDocument()
  })

  it('removes an item when its remove button is clicked', () => {
    render(
      <CartProvider>
        <Seed />
        <CartView />
      </CartProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(screen.getByText(/todavía no agregaste nada/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/cart/CartView.test.tsx` → FAIL

Create `src/components/cart/CartItemRow.tsx`:
```tsx
import type { CartItem } from '@/lib/cart/cart-types'
import { formatCurrencyARS } from '@/lib/format'

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-4 border-b border-secondary/20 py-4">
      <div>
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm text-text/70">{item.color}</p>
        <p className="text-sm">{formatCurrencyARS(item.unitPrice)}</p>
      </div>
      <input
        type="number"
        min={1}
        value={item.quantity}
        aria-label={`Cantidad de ${item.name}`}
        onChange={(e) => onUpdateQuantity(Number(e.target.value))}
        className="w-16 rounded-md bg-[#17171A] px-2 py-1 text-center"
      />
      <button type="button" onClick={onRemove} className="text-sm underline">
        Quitar
      </button>
    </div>
  )
}
```

Create `src/components/cart/CartView.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useCart } from './CartProvider'
import { CartItemRow } from './CartItemRow'
import { formatCurrencyARS } from '@/lib/format'

export function CartView() {
  const { items, updateQuantity, removeItem } = useCart()

  if (items.length === 0) {
    return (
      <main className="px-4 py-10 text-center md:px-10">
        <p className="mb-4">Todavía no agregaste nada a tu carrito.</p>
        <Link href="/" className="underline">
          Ver productos
        </Link>
      </main>
    )
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Tu carrito</h1>
      {items.map((item) => (
        <CartItemRow
          key={`${item.productId}-${item.color}`}
          item={item}
          onUpdateQuantity={(quantity) => updateQuantity(item.productId, item.color, quantity)}
          onRemove={() => removeItem(item.productId, item.color)}
        />
      ))}
      <p className="mt-6 text-lg font-semibold">Total: {formatCurrencyARS(total)}</p>
      <Link
        href="/checkout"
        className="mt-4 inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
      >
        Ir a pagar
      </Link>
    </main>
  )
}
```

Run: `npm test -- src/components/cart/CartView.test.tsx` → PASS (3 tests)

- [ ] **Step 3: Conectar la página real**

Create `src/app/carrito/page.tsx`:
```tsx
import { CartView } from '@/components/cart/CartView'

export default function Page() {
  return <CartView />
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: cart page (edit quantity, remove, total)"
```

---

## Task 14: Guardas de checkout (carrito vacío y disponibilidad)

**Files:**
- Create: `src/lib/checkout/guards.ts`
- Test: `src/lib/checkout/guards.test.ts`

**Interfaces:**
- Consumes: `type CartItem` (Tarea 11), `type Product` (Tarea 3)
- Produces: `canStartCheckout(items: CartItem[]): boolean`, `findUnavailableItems(items: CartItem[], products: Product[]): CartItem[]` — consumidas por la Tarea 15.

- [ ] **Step 1: Escribir los tests**

Create `src/lib/checkout/guards.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canStartCheckout, findUnavailableItems } from './guards'
import type { CartItem } from '@/lib/cart/cart-types'
import type { Product } from '@/types/product'

const item: CartItem = {
  productId: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  color: 'Rosa Gemma',
  unitPrice: 32000,
  quantity: 1,
  photo: '/products/lumalee-1.jpg',
}

const productAvailable: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: '',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: true }],
  photos: [],
  available: true,
}

describe('canStartCheckout', () => {
  it('is false for an empty cart', () => {
    expect(canStartCheckout([])).toBe(false)
  })

  it('is true when there is at least one item', () => {
    expect(canStartCheckout([item])).toBe(true)
  })
})

describe('findUnavailableItems', () => {
  it('returns an empty array when every item is still available', () => {
    expect(findUnavailableItems([item], [productAvailable])).toEqual([])
  })

  it('flags an item whose color became unavailable after it was added to the cart', () => {
    const nowUnavailable: Product = {
      ...productAvailable,
      colors: [{ name: 'Rosa Gemma', hex: '#FF4DA6', available: false }],
    }
    expect(findUnavailableItems([item], [nowUnavailable])).toEqual([item])
  })

  it('flags an item whose product no longer exists in the catalog', () => {
    expect(findUnavailableItems([item], [])).toEqual([item])
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/lib/checkout/guards.test.ts` → FAIL

Create `src/lib/checkout/guards.ts`:
```ts
import type { CartItem } from '@/lib/cart/cart-types'
import type { Product } from '@/types/product'

export function canStartCheckout(items: CartItem[]): boolean {
  return items.length > 0
}

export function findUnavailableItems(items: CartItem[], products: Product[]): CartItem[] {
  return items.filter((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return true
    const color = product.colors.find((c) => c.name === item.color)
    return !color || !color.available
  })
}
```

- [ ] **Step 3: Run (pass) → commit**

Run: `npm test -- src/lib/checkout/guards.test.ts` → PASS (5 tests)

```bash
git add -A
git commit -m "feat: checkout guards (empty cart, stale availability)"
```

---

## Task 15: Auth gate en checkout (Supabase) + zona de envío

**Files:**
- Create: `src/lib/auth/checkout-guard.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `proxy.ts`
- Create: `src/components/checkout/ShippingZoneSelect.tsx`
- Create: `src/components/checkout/LoginForm.tsx`
- Create: `src/app/checkout/page.tsx`
- Test: `src/lib/auth/checkout-guard.test.ts`

**Interfaces:**
- Produces: `shouldRequireAuth(step: 'cart' | 'shipping' | 'payment', isAuthenticated: boolean): boolean` — la regla de negocio exacta del spec ("login solo al pagar").
- Consumes: `canStartCheckout`, `findUnavailableItems` (Tarea 14), `getShippingZones` (Tarea 5), `useCart` (Tarea 11)

> **Pre-requisito manual (no automatizable en este plan):** antes de ejecutar esta tarea, crear un proyecto en [supabase.com](https://supabase.com) y completar `.env.local`:
> ```
> NEXT_PUBLIC_SUPABASE_URL=...
> NEXT_PUBLIC_SUPABASE_ANON_KEY=...
> ```
> Sin estas variables, el login real no funciona — pero toda la lógica de negocio de esta tarea (`shouldRequireAuth`) se testea sin necesitar Supabase.

- [ ] **Step 1: Test de la regla de auth**

Create `src/lib/auth/checkout-guard.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { shouldRequireAuth } from './checkout-guard'

describe('shouldRequireAuth', () => {
  it('does not require auth to browse the cart', () => {
    expect(shouldRequireAuth('cart', false)).toBe(false)
  })

  it('does not require auth to pick a shipping zone', () => {
    expect(shouldRequireAuth('shipping', false)).toBe(false)
  })

  it('requires auth only at the payment step, when not authenticated', () => {
    expect(shouldRequireAuth('payment', false)).toBe(true)
  })

  it('does not require auth at the payment step when already authenticated', () => {
    expect(shouldRequireAuth('payment', true)).toBe(false)
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/lib/auth/checkout-guard.test.ts` → FAIL

Create `src/lib/auth/checkout-guard.ts`:
```ts
export type CheckoutStep = 'cart' | 'shipping' | 'payment'

export function shouldRequireAuth(step: CheckoutStep, isAuthenticated: boolean): boolean {
  return step === 'payment' && !isAuthenticated
}
```

- [ ] **Step 3: Run (pass)**

Run: `npm test -- src/lib/auth/checkout-guard.test.ts` → PASS (4 tests)

- [ ] **Step 4: Instalar y configurar Supabase**

Run: `npm install @supabase/ssr @supabase/supabase-js`

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

Create `proxy.ts` (raíz del proyecto — en Next.js 16 el archivo se llama `proxy.ts`, ya no `middleware.ts`):
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => response.cookies.set(name, value))
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Componentes de checkout**

Create `src/components/checkout/ShippingZoneSelect.tsx`:
```tsx
'use client'

import type { ShippingZone } from '@/lib/shipping'

export function ShippingZoneSelect({
  zones,
  value,
  onChange,
}: {
  zones: ShippingZone[]
  value: string
  onChange: (zoneId: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Zona de envío</legend>
      {zones.map((zone) => (
        <label key={zone.id} className="mb-2 flex items-center gap-2">
          <input
            type="radio"
            name="shipping-zone"
            value={zone.id}
            checked={value === zone.id}
            onChange={() => onChange(zone.id)}
          />
          {zone.name} — {zone.rate === 0 ? 'Gratis' : `$${zone.rate}`}
        </label>
      ))}
    </fieldset>
  )
}
```

Create `src/components/checkout/LoginForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function LoginForm({
  onAuthenticated,
}: {
  onAuthenticated: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (sendError) {
      setError('No pudimos enviarte el código. Probá de nuevo.')
      return
    }
    setCodeSent(true)
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (verifyError) {
      setError('Ese código no es válido o venció. Pedí uno nuevo.')
      return
    }
    // La sesión queda confirmada recién acá, después de validar el código —
    // nunca al solo enviarlo (ver Review Focus: no asumir login sin verificar).
    onAuthenticated(email)
  }

  if (!codeSent) {
    return (
      <form onSubmit={handleSendCode} className="flex flex-col gap-3">
        <p>Para pagar necesitamos que ingreses tu email. Te mandamos un código, sin contraseña.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="rounded-md bg-[#17171A] px-3 py-2"
        />
        {error && <p className="text-sm text-primary">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
        >
          Enviarme el código para pagar
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
      <p>Te mandamos un código a {email}. Ingresalo para continuar.</p>
      <input
        type="text"
        inputMode="numeric"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className="rounded-md bg-[#17171A] px-3 py-2"
      />
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="submit"
        className="rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
      >
        Confirmar código
      </button>
    </form>
  )
}
```

> **Nota:** se usa un código de 6 dígitos (`signInWithOtp` + `verifyOtp`) en vez de un magic link, porque un magic link exige salir de la pestaña y requeriría una ruta de callback que no forma parte de este plan; el código se confirma en la misma página. `onAuthenticated` solo se llama después de `verifyOtp` exitoso — nunca al enviar el código — para no marcar como autenticada a una sesión que todavía no se confirmó.

- [ ] **Step 6: Página de checkout (orquesta carrito → envío → auth gate)**

Create `src/app/checkout/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/cart/CartProvider'
import { canStartCheckout } from '@/lib/checkout/guards'
import { getShippingZones } from '@/lib/shipping'
import { ShippingZoneSelect } from '@/components/checkout/ShippingZoneSelect'
import { LoginForm } from '@/components/checkout/LoginForm'
import { shouldRequireAuth } from '@/lib/auth/checkout-guard'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const router = useRouter()
  const { items } = useCart()
  const [zoneId, setZoneId] = useState(getShippingZones()[0]?.id ?? '')
  const [address, setAddress] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    if (!canStartCheckout(items)) {
      router.replace('/carrito')
    }
  }, [items, router])

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        setIsAuthenticated(Boolean(data.user))
        setCustomerEmail(data.user?.email ?? null)
        setCheckedAuth(true)
      })
  }, [])

  if (!canStartCheckout(items)) return null
  if (!checkedAuth) return <p className="px-4 py-10">Cargando...</p>

  const requiresAuth = shouldRequireAuth('payment', isAuthenticated)

  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
      <label className="mb-6 block">
        <span className="mb-2 block font-semibold">Dirección de entrega</span>
        <input
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, piso/depto, ciudad"
          className="w-full rounded-md bg-[#17171A] px-3 py-2"
        />
      </label>
      <ShippingZoneSelect zones={getShippingZones()} value={zoneId} onChange={setZoneId} />
      {requiresAuth ? (
        <div className="mt-6">
          <LoginForm
            onAuthenticated={(email) => {
              setIsAuthenticated(true)
              setCustomerEmail(email)
            }}
          />
        </div>
      ) : (
        <p className="mt-6">
          Zona seleccionada: {zoneId}. (El paso de medio de pago se agrega en la Tarea 17.)
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: checkout auth gate (login required only at payment step)"
```

---

## Task 16: Pedidos (tipos + repositorio + composición)

**Files:**
- Create: `src/types/order.ts`
- Create: `src/lib/orders.ts`
- Create: `src/lib/orders/supabase-orders-repository.ts`
- Test: `src/lib/orders.test.ts`

**Interfaces:**
- Produces: `type OrderItem`, `type OrderInput`, `type Order`, `interface OrdersRepository { createOrder; updateOrderPaymentStatus }`, `computeOrderTotal(items, shippingTotal): number`, `createOrderFromCart(repo, input): Promise<Order>`, `createInMemoryOrdersRepository(): OrdersRepository` — consumidas por Tareas 17, 18.
- Produces: `createSupabaseOrdersRepository(client): OrdersRepository` — implementación real, no testeada con red (ver nota).

- [ ] **Step 1: Tipos de pedido**

Create `src/types/order.ts`:
```ts
export type PaymentMethod = 'mercado_pago' | 'transferencia' | 'efectivo'
export type PaymentStatus = 'pendiente' | 'pagado' | 'rechazado'
export type ShippingStatus = 'a_confirmar' | 'enviado'

export type OrderItem = {
  productId: string
  color: string
  quantity: number
  unitPrice: number
}

export type OrderInput = {
  items: OrderItem[]
  shippingZoneId: string
  paymentMethod: PaymentMethod
  customerEmail: string
  address: string
}

export type Order = OrderInput & {
  id: string
  total: number
  paymentStatus: PaymentStatus
  shippingStatus: ShippingStatus
  createdAt: string
}
```

- [ ] **Step 2: Tests de la composición de pedido**

Create `src/lib/orders.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  computeOrderTotal,
  createOrderFromCart,
  createInMemoryOrdersRepository,
} from './orders'
import type { OrderInput } from '@/types/order'

describe('computeOrderTotal', () => {
  it('sums item totals plus shipping', () => {
    const total = computeOrderTotal(
      [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 2, unitPrice: 32000 }],
      3500
    )
    expect(total).toBe(2 * 32000 + 3500)
  })
})

describe('createOrderFromCart', () => {
  const input: OrderInput = {
    items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
    shippingZoneId: 'caba',
    paymentMethod: 'transferencia',
    customerEmail: 'cliente@example.com',
    address: 'Calle Falsa 123',
  }

  it('creates an order with the correct total and initial statuses', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await createOrderFromCart(repo, input)
    expect(order.total).toBe(32000 + 3500)
    expect(order.paymentStatus).toBe('pendiente')
    expect(order.shippingStatus).toBe('a_confirmar')
    expect(order.id).toBeTruthy()
  })

  it('persists the order in the repository', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await createOrderFromCart(repo, input)
    const updated = await repo.updateOrderPaymentStatus(order.id, 'pagado')
    expect(updated.paymentStatus).toBe('pagado')
  })

  it('throws when updating a non-existent order', async () => {
    const repo = createInMemoryOrdersRepository()
    await expect(repo.updateOrderPaymentStatus('no-existe', 'pagado')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run (fail) → implementar**

Run: `npm test -- src/lib/orders.test.ts` → FAIL

Create `src/lib/orders.ts`:
```ts
import { randomUUID } from 'node:crypto'
import { calculateShippingTotal } from './shipping'
import type { Order, OrderInput, OrderItem, PaymentStatus } from '@/types/order'

export function computeOrderTotal(items: OrderItem[], shippingTotal: number): number {
  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  return itemsTotal + shippingTotal
}

export interface OrdersRepository {
  createOrder(input: OrderInput, total: number): Promise<Order>
  updateOrderPaymentStatus(orderId: string, status: PaymentStatus): Promise<Order>
}

export async function createOrderFromCart(
  repo: OrdersRepository,
  input: OrderInput
): Promise<Order> {
  const shippingTotal = calculateShippingTotal(input.shippingZoneId)
  const total = computeOrderTotal(input.items, shippingTotal)
  return repo.createOrder(input, total)
}

export function createInMemoryOrdersRepository(): OrdersRepository {
  const orders = new Map<string, Order>()

  return {
    async createOrder(input, total) {
      const order: Order = {
        ...input,
        id: randomUUID(),
        total,
        paymentStatus: 'pendiente',
        shippingStatus: 'a_confirmar',
        createdAt: new Date().toISOString(),
      }
      orders.set(order.id, order)
      return order
    },
    async updateOrderPaymentStatus(orderId, status) {
      const order = orders.get(orderId)
      if (!order) {
        throw new Error(`updateOrderPaymentStatus: unknown order ${orderId}`)
      }
      const updated: Order = { ...order, paymentStatus: status }
      orders.set(orderId, updated)
      return updated
    },
  }
}
```

- [ ] **Step 4: Run (pass)**

Run: `npm test -- src/lib/orders.test.ts` → PASS (4 tests)

- [ ] **Step 5: Implementación real contra Supabase (no testeada con red; requiere crear la tabla)**

> **Pre-requisito manual:** crear en Supabase la tabla `orders` con columnas equivalentes a `Order` (ver `types/order.ts`). Este paso queda documentado acá porque excede el alcance de un test automatizado sin una base de datos real; se verifica manualmente contra el proyecto Supabase real antes de ir a producción.

Create `src/lib/orders/supabase-orders-repository.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, OrderInput, PaymentStatus } from '@/types/order'
import type { OrdersRepository } from '@/lib/orders'

export function createSupabaseOrdersRepository(client: SupabaseClient): OrdersRepository {
  return {
    async createOrder(input: OrderInput, total: number): Promise<Order> {
      const { data, error } = await client
        .from('orders')
        .insert({
          items: input.items,
          shipping_zone_id: input.shippingZoneId,
          payment_method: input.paymentMethod,
          customer_email: input.customerEmail,
          address: input.address,
          total,
          payment_status: 'pendiente',
          shipping_status: 'a_confirmar',
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(`createOrder failed: ${error?.message}`)
      }

      return {
        id: data.id,
        items: input.items,
        shippingZoneId: input.shippingZoneId,
        paymentMethod: input.paymentMethod,
        customerEmail: input.customerEmail,
        address: input.address,
        total: data.total,
        paymentStatus: data.payment_status,
        shippingStatus: data.shipping_status,
        createdAt: data.created_at,
      }
    },

    async updateOrderPaymentStatus(orderId: string, status: PaymentStatus): Promise<Order> {
      const { data, error } = await client
        .from('orders')
        .update({ payment_status: status })
        .eq('id', orderId)
        .select()
        .single()

      if (error || !data) {
        throw new Error(`updateOrderPaymentStatus failed: ${error?.message}`)
      }

      return {
        id: data.id,
        items: data.items,
        shippingZoneId: data.shipping_zone_id,
        paymentMethod: data.payment_method,
        customerEmail: data.customer_email,
        address: data.address,
        total: data.total,
        paymentStatus: data.payment_status,
        shippingStatus: data.shipping_status,
        createdAt: data.created_at,
      }
    },
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: orders repository (in-memory fake + Supabase implementation)"
```

---

## Task 17: Mercado Pago (preferencia + webhook)

**Files:**
- Create: `src/lib/mercadopago.ts`
- Create: `src/app/api/mercadopago/webhook/route.ts`
- Test: `src/lib/mercadopago.test.ts`
- Test: `src/app/api/mercadopago/webhook/route.test.ts`

**Interfaces:**
- Consumes: `type Order`, `OrdersRepository` (Tarea 16)
- Produces: `buildPreferencePayload(order)`, `mapMercadoPagoStatusToOrderStatus(mpStatus)`, `parseWebhookPayload(raw)`, `createPreference(payload, accessToken)` — usadas por la página de checkout y la ruta de webhook.

> **Pre-requisito manual:** crear una aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) y completar `.env.local` con `MERCADOPAGO_ACCESS_TOKEN`. Sin esto, `createPreference` no puede llamar a la API real — pero el resto de esta tarea se testea sin red.

- [ ] **Step 1: Tests de las funciones puras**

Create `src/lib/mercadopago.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  buildPreferencePayload,
  mapMercadoPagoStatusToOrderStatus,
  parseWebhookPayload,
} from './mercadopago'
import type { Order } from '@/types/order'

const order: Order = {
  id: 'order-1',
  items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
  shippingZoneId: 'caba',
  paymentMethod: 'mercado_pago',
  customerEmail: 'cliente@example.com',
  address: 'Calle Falsa 123',
  total: 35500,
  paymentStatus: 'pendiente',
  shippingStatus: 'a_confirmar',
  createdAt: new Date().toISOString(),
}

describe('buildPreferencePayload', () => {
  it('includes one item per order item plus the order id as external_reference', () => {
    const payload = buildPreferencePayload(order)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({ quantity: 1, unit_price: 32000, currency_id: 'ARS' })
    expect(payload.external_reference).toBe('order-1')
  })
})

describe('mapMercadoPagoStatusToOrderStatus', () => {
  it.each([
    ['approved', 'pagado'],
    ['rejected', 'rechazado'],
    ['pending', 'pendiente'],
    ['in_process', 'pendiente'],
  ])('maps MP status %s to order status %s', (mpStatus, expected) => {
    expect(mapMercadoPagoStatusToOrderStatus(mpStatus)).toBe(expected)
  })
})

describe('parseWebhookPayload', () => {
  it('extracts orderId and status from a valid payload', () => {
    const raw = { data: { id: 'mp-payment-1' }, external_reference: 'order-1', status: 'approved' }
    expect(parseWebhookPayload(raw)).toEqual({ orderId: 'order-1', mpStatus: 'approved' })
  })

  it('returns null for a malformed payload', () => {
    expect(parseWebhookPayload({ foo: 'bar' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/lib/mercadopago.test.ts` → FAIL

Create `src/lib/mercadopago.ts`:
```ts
import type { Order, PaymentStatus } from '@/types/order'

export type PreferenceItem = {
  title: string
  quantity: number
  unit_price: number
  currency_id: 'ARS'
}

export type PreferencePayload = {
  items: PreferenceItem[]
  external_reference: string
  back_urls: { success: string; failure: string; pending: string }
}

export function buildPreferencePayload(order: Order): PreferencePayload {
  return {
    items: order.items.map((item) => ({
      title: `${item.productId} (${item.color})`,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: 'ARS',
    })),
    external_reference: order.id,
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion?order=${order.id}`,
      failure: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?order=${order.id}&status=failure`,
      pending: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?order=${order.id}&status=pending`,
    },
  }
}

export function mapMercadoPagoStatusToOrderStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'pagado'
    case 'rejected':
      return 'rechazado'
    default:
      return 'pendiente'
  }
}

export function parseWebhookPayload(raw: unknown): { orderId: string; mpStatus: string } | null {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'external_reference' in raw &&
    'status' in raw &&
    typeof (raw as Record<string, unknown>).external_reference === 'string' &&
    typeof (raw as Record<string, unknown>).status === 'string'
  ) {
    return {
      orderId: (raw as Record<string, string>).external_reference,
      mpStatus: (raw as Record<string, string>).status,
    }
  }
  return null
}

export async function createPreference(
  payload: PreferencePayload,
  accessToken: string
): Promise<{ init_point: string }> {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`createPreference failed: ${response.status}`)
  }
  return response.json()
}
```

- [ ] **Step 3: Run (pass)**

Run: `npm test -- src/lib/mercadopago.test.ts` → PASS (8 tests)

- [ ] **Step 4: Tests de la ruta de webhook (idempotencia incluida)**

Create `src/app/api/mercadopago/webhook/route.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { handleWebhookPayload } from './route'
import { createInMemoryOrdersRepository } from '@/lib/orders'

describe('handleWebhookPayload', () => {
  it('updates the order payment status on a valid payload', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await repo.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )

    const result = await handleWebhookPayload(repo, {
      external_reference: order.id,
      status: 'approved',
    })

    expect(result.ok).toBe(true)
    const updated = await repo.updateOrderPaymentStatus(order.id, 'pagado')
    expect(updated.paymentStatus).toBe('pagado')
  })

  it('is idempotent: processing the same approved payload twice does not error', async () => {
    const repo = createInMemoryOrdersRepository()
    const order = await repo.createOrder(
      {
        items: [{ productId: 'lumalee', color: 'Rosa Gemma', quantity: 1, unitPrice: 32000 }],
        shippingZoneId: 'caba',
        paymentMethod: 'mercado_pago',
        customerEmail: 'cliente@example.com',
        address: 'Calle Falsa 123',
      },
      35500
    )

    const payload = { external_reference: order.id, status: 'approved' }
    const first = await handleWebhookPayload(repo, payload)
    const second = await handleWebhookPayload(repo, payload)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
  })

  it('returns ok:false for a malformed payload instead of throwing', async () => {
    const repo = createInMemoryOrdersRepository()
    const result = await handleWebhookPayload(repo, { foo: 'bar' })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when the referenced order does not exist', async () => {
    const repo = createInMemoryOrdersRepository()
    const result = await handleWebhookPayload(repo, {
      external_reference: 'no-existe',
      status: 'approved',
    })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 5: Run (fail) → implementar**

Run: `npm test -- src/app/api/mercadopago/webhook/route.test.ts` → FAIL

Create `src/app/api/mercadopago/webhook/route.ts`:
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  parseWebhookPayload,
  mapMercadoPagoStatusToOrderStatus,
} from '@/lib/mercadopago'
import { createInMemoryOrdersRepository, type OrdersRepository } from '@/lib/orders'
import { createSupabaseOrdersRepository } from '@/lib/orders/supabase-orders-repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function handleWebhookPayload(
  repo: OrdersRepository,
  raw: unknown
): Promise<{ ok: boolean }> {
  const parsed = parseWebhookPayload(raw)
  if (!parsed) return { ok: false }

  try {
    const status = mapMercadoPagoStatusToOrderStatus(parsed.mpStatus)
    // updateOrderPaymentStatus vuelve a escribir el mismo estado si el webhook
    // llega duplicado — no es una operación aditiva, así que es naturalmente
    // idempotente: aplicarla dos veces deja el pedido en el mismo estado.
    await repo.updateOrderPaymentStatus(parsed.orderId, status)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.json()
  const supabase = await createSupabaseServerClient()
  const repo = createSupabaseOrdersRepository(supabase)
  const result = await handleWebhookPayload(repo, raw)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
```

> **Nota:** `createInMemoryOrdersRepository` se importa en el test, no en `route.ts` — queda disponible para quien quiera correr este endpoint contra un repo en memoria en un entorno de desarrollo sin Supabase configurado, como menciona el comentario del repositorio en la Tarea 16.

- [ ] **Step 6: Run (pass)**

Run: `npm test -- src/app/api/mercadopago/webhook/route.test.ts` → PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Mercado Pago preference + idempotent webhook handler"
```

---

## Task 18: Flujo de transferencia/efectivo + confirmación de pedido

**Files:**
- Create: `src/components/checkout/PaymentMethodSelect.tsx`
- Create: `src/components/checkout/TransferInstructions.tsx`
- Create: `src/app/checkout/actions.ts`
- Modify: `src/app/checkout/page.tsx`
- Test: `src/components/checkout/TransferInstructions.test.tsx`

**Interfaces:**
- Consumes: `createOrderFromCart`, `createInMemoryOrdersRepository`/`createSupabaseOrdersRepository` (Tarea 16), `findUnavailableItems` (Tarea 14), `buildPreferencePayload`, `createPreference` (Tarea 17)
- Produces: `confirmMercadoPagoOrder(input: OrderInput): Promise<{ initPoint: string }>` (Server Action, `src/app/checkout/actions.ts`)

- [ ] **Step 1: Test de `TransferInstructions`**

Create `src/components/checkout/TransferInstructions.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransferInstructions } from './TransferInstructions'

describe('TransferInstructions', () => {
  it('shows the order id so the customer can reference it', () => {
    render(<TransferInstructions orderId="order-123" total={35500} />)
    expect(screen.getByText(/order-123/)).toBeInTheDocument()
  })

  it('shows the total to transfer', () => {
    render(<TransferInstructions orderId="order-123" total={35500} />)
    expect(screen.getByText(/35\.500/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/components/checkout/TransferInstructions.test.tsx` → FAIL

Create `src/components/checkout/TransferInstructions.tsx`:
```tsx
import { formatCurrencyARS } from '@/lib/format'

export function TransferInstructions({
  orderId,
  total,
}: {
  orderId: string
  total: number
}) {
  return (
    <div className="rounded-lg bg-[#17171A] p-6">
      <p className="mb-2 font-semibold">¡Ya casi! Tu pedido es #{orderId}</p>
      <p className="mb-4">
        Transferí {formatCurrencyARS(total)} y mandanos el comprobante a
        somosgemma.ar@gmail.com. En cuanto lo veamos, preparamos tu pedido 💌
      </p>
      <p className="text-sm text-text/70">Alias: gemma.tienda</p>
    </div>
  )
}
```

Run: `npm test -- src/components/checkout/TransferInstructions.test.tsx` → PASS (2 tests)

- [ ] **Step 3: Server Action para confirmar el pedido vía Mercado Pago**

Create `src/app/checkout/actions.ts`:
```ts
'use server'

import { createOrderFromCart, createInMemoryOrdersRepository } from '@/lib/orders'
import { buildPreferencePayload, createPreference } from '@/lib/mercadopago'
import type { OrderInput } from '@/types/order'

export async function confirmMercadoPagoOrder(
  input: OrderInput
): Promise<{ initPoint: string }> {
  // createInMemoryOrdersRepository se reemplaza por createSupabaseOrdersRepository
  // (Tarea 16) una vez que el proyecto Supabase real esté configurado; la
  // composición (crear pedido -> armar preferencia -> pedir el init_point) es
  // la misma con cualquiera de los dos repositorios, porque ambos implementan
  // OrdersRepository.
  const repo = createInMemoryOrdersRepository()
  const order = await createOrderFromCart(repo, input)
  const payload = buildPreferencePayload(order)
  const { init_point } = await createPreference(
    payload,
    process.env.MERCADOPAGO_ACCESS_TOKEN!
  )
  return { initPoint: init_point }
}
```

> **Nota:** este Server Action es "pegamento" delgado sobre funciones ya testeadas en las Tareas 16 y 17 (`createOrderFromCart`, `buildPreferencePayload`, `createPreference`) — mismo patrón que `route.ts` en la Tarea 17, donde la lógica se testea extraída y el adaptador de Next.js queda sin test propio porque llama a la API real de Mercado Pago.

- [ ] **Step 4: Crear `PaymentMethodSelect` y completar `checkout/page.tsx`**

Create `src/components/checkout/PaymentMethodSelect.tsx`:
```tsx
'use client'

import type { PaymentMethod } from '@/types/order'

const options: { value: PaymentMethod; label: string }[] = [
  { value: 'mercado_pago', label: 'Mercado Pago (tarjetas, hasta 12 cuotas)' },
  { value: 'transferencia', label: 'Transferencia (10% off)' },
  { value: 'efectivo', label: 'Efectivo, retiro en Vicente López (10% off)' },
]

export function PaymentMethodSelect({
  value,
  onChange,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Medio de pago</legend>
      {options.map((option) => (
        <label key={option.value} className="mb-2 flex items-center gap-2">
          <input
            type="radio"
            name="payment-method"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
```

Modify `src/app/checkout/page.tsx` — agregar, dentro del bloque `else` que hoy muestra el texto temporal ("Zona seleccionada..."), el paso de medio de pago y la confirmación:
```tsx
// agregar al import existente de 'next/navigation'/etc:
import { confirmMercadoPagoOrder } from './actions'

// agregar al estado del componente:
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercado_pago')
const [unavailableWarning, setUnavailableWarning] = useState<string | null>(null)
const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number } | null>(
  null
)

async function handleConfirm() {
  if (!address.trim()) {
    setUnavailableWarning('Ingresá una dirección de entrega para continuar.')
    return
  }

  if (!customerEmail) {
    // No debería poder llegar acá: requiresAuth ya bloqueó este paso hasta
    // que shouldRequireAuth('payment', isAuthenticated) sea false, lo cual
    // solo pasa después de un verifyOtp exitoso que sí trae el email.
    setUnavailableWarning('No pudimos confirmar tu sesión. Volvé a iniciar sesión.')
    return
  }

  const products = getAllProducts()
  const cartItems = items.map((i) => ({
    productId: i.productId,
    color: i.color,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }))
  const unavailable = findUnavailableItems(items, products)
  if (unavailable.length > 0) {
    setUnavailableWarning(
      `"${unavailable[0].name}" en color ${unavailable[0].color} ya no está disponible. Quitalo del carrito para continuar.`
    )
    return
  }

  const orderInput = {
    items: cartItems,
    shippingZoneId: zoneId,
    paymentMethod,
    customerEmail,
    address,
  }

  if (paymentMethod === 'mercado_pago') {
    const { initPoint } = await confirmMercadoPagoOrder(orderInput)
    window.location.href = initPoint
    return
  }

  const repo = createInMemoryOrdersRepository() // reemplazar por el repo de Supabase real una vez configurado
  const order = await createOrderFromCart(repo, orderInput)
  setConfirmedOrder({ id: order.id, total: order.total })
}

// en el JSX, después del ShippingZoneSelect y dentro de la rama "ya autenticada":
{confirmedOrder ? (
  <TransferInstructions orderId={confirmedOrder.id} total={confirmedOrder.total} />
) : (
  <>
    <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
    {unavailableWarning && <p className="text-primary">{unavailableWarning}</p>}
    <button onClick={handleConfirm} className="mt-4 rounded-full bg-primary px-7 py-3.5 font-semibold text-text">
      Confirmar pedido
    </button>
  </>
)}
```

> **Nota:** `createInMemoryOrdersRepository` en la rama de transferencia/efectivo se reemplaza por `createSupabaseOrdersRepository` (Tarea 16) una vez que el proyecto Supabase real esté configurado — mismo repositorio que ya usa `confirmMercadoPagoOrder` en el Server Action del Step 3.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: payment method selection and transfer/efectivo confirmation flow"
```

---

## Task 19: Páginas de contenido (contacto, envíos y pagos, FAQ, botón de arrepentimiento)

**Files:**
- Create: `src/app/contacto/page.tsx`
- Create: `src/app/envios-y-pagos/page.tsx`
- Create: `src/app/faq/page.tsx`
- Create: `src/app/arrepentimiento/page.tsx`
- Test: `src/app/arrepentimiento/page.test.tsx`

**Interfaces:**
- Ninguna — páginas de contenido estático sin dependencias de otras tareas más allá del `Header`/`Footer` ya montados globalmente.

- [ ] **Step 1: Test de la página de botón de arrepentimiento (la única con un requisito legal verificable)**

Create `src/app/arrepentimiento/page.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

describe('Botón de arrepentimiento page', () => {
  it('explains the right to retract and how to exercise it', () => {
    render(<Page />)
    expect(screen.getByRole('heading', { name: /botón de arrepentimiento/i })).toBeInTheDocument()
    expect(screen.getByText(/10 días/)).toBeInTheDocument()
    expect(screen.getByText('somosgemma.ar@gmail.com')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run (fail) → implementar las 4 páginas**

Run: `npm test -- src/app/arrepentimiento/page.test.tsx` → FAIL

Create `src/app/arrepentimiento/page.tsx`:
```tsx
export default function Page() {
  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">Botón de arrepentimiento</h1>
      <p className="mb-4">
        Como compradora, tenés derecho a arrepentirte de tu compra dentro de
        los 10 días corridos desde que la recibís, sin tener que dar ningún
        motivo (Ley de Defensa del Consumidor, art. 1110 y Resolución
        424/2020).
      </p>
      <p className="mb-4">
        Para ejercer este derecho, escribinos a{' '}
        <a href="mailto:somosgemma.ar@gmail.com" className="underline">
          somosgemma.ar@gmail.com
        </a>{' '}
        indicando el número de pedido. Te confirmamos la cancelación y te
        contamos cómo seguir con la devolución.
      </p>
    </main>
  )
}
```

> **Nota de alcance:** esta página implementa el requisito legal con el mismo mecanismo que ya usa Gemma en Empretienda (solicitud por contacto directo), sin crear una entidad nueva de "solicitud de arrepentimiento" en la base de datos — la spec aprobada no define esa entidad, y agregarla ahora sería ampliar el alcance sin pasar por su propio brainstorming. Si más adelante se quiere un flujo con formulario + seguimiento en el panel admin, es una tarea nueva sobre la spec de admin (fuera de este plan).

Create `src/app/contacto/page.tsx`:
```tsx
export default function Page() {
  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">Contacto</h1>
      <p>
        ¿Tenés una pregunta sobre tu pedido o sobre algún producto? Escribinos
        a{' '}
        <a href="mailto:somosgemma.ar@gmail.com" className="underline">
          somosgemma.ar@gmail.com
        </a>
        . Te respondemos a la brevedad 💌
      </p>
    </main>
  )
}
```

Create `src/app/envios-y-pagos/page.tsx`:
```tsx
export default function Page() {
  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">Envíos y pagos</h1>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Envíos</h2>
        <p>
          Enviamos a todo el país por Correo Argentino, con tarifa fija según
          tu zona. También podés retirar sin cargo en Vicente López.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Medios de pago</h2>
        <p>
          Mercado Pago (tarjetas, hasta 12 cuotas), transferencia bancaria o
          efectivo — estas dos últimas con 10% de descuento.
        </p>
      </section>
    </main>
  )
}
```

Create `src/app/faq/page.tsx`:
```tsx
const faqs = [
  {
    question: '¿Cómo sé si un producto tiene stock en el color que quiero?',
    answer:
      'En la ficha de producto, los colores que ya no tenés disponibles aparecen atenuados y no se pueden seleccionar.',
  },
  {
    question: '¿Puedo pagar en cuotas?',
    answer: 'Sí, con Mercado Pago podés pagar hasta en 12 cuotas con todas las tarjetas.',
  },
  {
    question: '¿Tengo que crear una cuenta para comprar?',
    answer:
      'No para navegar ni armar tu carrito. Te vamos a pedir que inicies sesión únicamente en el último paso, antes de pagar.',
  },
]

export default function Page() {
  return (
    <main className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Preguntas frecuentes</h1>
      <dl>
        {faqs.map((faq) => (
          <div key={faq.question} className="mb-4">
            <dt className="font-semibold">{faq.question}</dt>
            <dd className="text-text/80">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
```

- [ ] **Step 3: Run (pass)**

Run: `npm test -- src/app/arrepentimiento/page.test.tsx` → PASS (1 test)

- [ ] **Step 4: Verificar manualmente los 4 links del footer y commit**

Run: `npm run dev` → clickear cada link del footer (Tarea 7) y confirmar que ninguno da 404.

```bash
git add -A
git commit -m "feat: content pages (contacto, envíos y pagos, FAQ, botón de arrepentimiento)"
```

---

## Task 20: SEO (metadata, JSON-LD de producto, sitemap)

**Files:**
- Create: `src/lib/seo/json-ld.ts`
- Create: `src/lib/seo/sitemap.ts`
- Create: `src/app/sitemap.ts`
- Modify: `src/app/producto/[slug]/page.tsx`
- Modify: `src/app/categoria/[slug]/page.tsx`
- Test: `src/lib/seo/json-ld.test.ts`
- Test: `src/lib/seo/sitemap.test.ts`

**Interfaces:**
- Consumes: `type Product`, `type Category` (Tarea 3)
- Produces: `buildProductJsonLd(product, url)`, `serializeJsonLd(data)`, `buildSitemapEntries(baseUrl, products, categories)`

- [ ] **Step 1: Tests de JSON-LD**

Create `src/lib/seo/json-ld.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildProductJsonLd, serializeJsonLd } from './json-ld'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'lumalee',
  slug: 'lampara-lumalee',
  name: 'Lámpara Lumalee',
  description: 'Una nube con luz.',
  categorySlug: 'lamparas',
  price: 32000,
  colors: [],
  photos: ['/products/lumalee-1.jpg'],
  available: true,
}

describe('buildProductJsonLd', () => {
  it('builds a schema.org Product with offer and availability', () => {
    const jsonLd = buildProductJsonLd(product, 'https://gemma.ar/producto/lampara-lumalee')
    expect(jsonLd['@type']).toBe('Product')
    expect(jsonLd.offers.price).toBe(32000)
    expect(jsonLd.offers.availability).toBe('https://schema.org/InStock')
  })

  it('marks an unavailable product as OutOfStock', () => {
    const jsonLd = buildProductJsonLd(
      { ...product, available: false },
      'https://gemma.ar/producto/lampara-lumalee'
    )
    expect(jsonLd.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('serializeJsonLd', () => {
  it('escapes "<" to prevent script-tag injection', () => {
    const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(serialized).not.toContain('<')
  })
})
```

- [ ] **Step 2: Run (fail) → implementar**

Run: `npm test -- src/lib/seo/json-ld.test.ts` → FAIL

Create `src/lib/seo/json-ld.ts`:
```ts
import type { Product } from '@/types/product'

export function buildProductJsonLd(product: Product, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product' as const,
    name: product.name,
    description: product.description,
    image: product.photos,
    sku: product.id,
    offers: {
      '@type': 'Offer' as const,
      price: product.price,
      priceCurrency: 'ARS',
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  }
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
```

- [ ] **Step 3: Run (pass)**

Run: `npm test -- src/lib/seo/json-ld.test.ts` → PASS (3 tests)

- [ ] **Step 4: Montar el JSON-LD y `generateMetadata` en la ficha de producto**

Modify `src/app/producto/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/catalog'
import { ProductDetailView } from '@/components/product/ProductDetailView'
import { buildProductJsonLd, serializeJsonLd } from '@/lib/seo/json-ld'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return {}
  return {
    title: `${product.name} — Gemma`,
    description: product.description,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/producto/${product.slug}`
  const jsonLd = buildProductJsonLd(product, url)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ProductDetailView product={product} />
    </>
  )
}
```

- [ ] **Step 5: Tests del sitemap**

Create `src/lib/seo/sitemap.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSitemapEntries } from './sitemap'
import type { Product, Category } from '@/types/product'

const products: Product[] = [
  {
    id: '1',
    slug: 'lampara-lumalee',
    name: 'Lámpara Lumalee',
    description: '',
    categorySlug: 'lamparas',
    price: 32000,
    colors: [],
    photos: [],
    available: true,
  },
]
const categories: Category[] = [{ slug: 'lamparas', name: 'Lámparas', order: 1 }]

describe('buildSitemapEntries', () => {
  it('includes the home, each category, and each product', () => {
    const entries = buildSitemapEntries('https://gemma.ar', products, categories)
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://gemma.ar')
    expect(urls).toContain('https://gemma.ar/categoria/lamparas')
    expect(urls).toContain('https://gemma.ar/producto/lampara-lumalee')
  })
})
```

- [ ] **Step 6: Run (fail) → implementar**

Run: `npm test -- src/lib/seo/sitemap.test.ts` → FAIL

Create `src/lib/seo/sitemap.ts`:
```ts
import type { Product, Category } from '@/types/product'

export type SitemapEntry = { url: string }

export function buildSitemapEntries(
  baseUrl: string,
  products: Product[],
  categories: Category[]
): SitemapEntry[] {
  return [
    { url: baseUrl },
    ...categories.map((c) => ({ url: `${baseUrl}/categoria/${c.slug}` })),
    ...products.map((p) => ({ url: `${baseUrl}/producto/${p.slug}` })),
  ]
}
```

- [ ] **Step 7: Run (pass)**

Run: `npm test -- src/lib/seo/sitemap.test.ts` → PASS (1 test)

- [ ] **Step 8: Conectar `app/sitemap.ts`**

Create `src/app/sitemap.ts`:
```ts
import type { MetadataRoute } from 'next'
import { getAllProducts, getAllCategories } from '@/lib/catalog'
import { buildSitemapEntries } from '@/lib/seo/sitemap'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gemma.ar'
  const entries = buildSitemapEntries(baseUrl, getAllProducts(), getAllCategories())
  return entries.map((entry) => ({ url: entry.url, lastModified: new Date() }))
}
```

- [ ] **Step 9: Verificar manualmente y commit**

Run: `npm run dev` → visitar `/sitemap.xml` y `/producto/lampara-lumalee` (ver `<script type="application/ld+json">` en el HTML fuente).

```bash
git add -A
git commit -m "feat: SEO (metadata, Product JSON-LD, sitemap)"
```

---

## Fuera de alcance de este plan

- **Panel de administración** (CRUD de productos/pedidos/zonas de envío, login de Gemma vía Supabase con rol admin). La spec aprobada lo incluye en el MVP, pero las 8 tareas que pidió este prompt cubren solo el storefront — este plan deja el catálogo editable únicamente vía `src/data/products.json` hasta que exista un plan de admin dedicado.
- **Visor 3D de producto.** El prompt de scaffold lo lista como tarea 8 "opcional", pero la spec aprobada (`docs/superpowers/specs/2026-10-07-tienda-online-mvp-design.md`, sección 10) lo excluye explícitamente del alcance v1. Se señala esta contradicción entre ambos documentos en vez de resolverla en silencio — si se decide incluirlo, es un alcance nuevo que necesita su propio brainstorming (qué productos lo tienen, formato de modelo, visor a usar), no una tarea chica de este plan.
- **Control de stock por unidad** y **cálculo automático de envío vía API de Correo Argentino** — excluidos explícitamente por la spec aprobada.
