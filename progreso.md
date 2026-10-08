# Progreso — Storefront MVP Gemma

Checklist humano de las 20 tareas del plan
(`docs/superpowers/plans/2026-10-07-tienda-online-mvp-plan.md`), ejecutado
con `superpowers:subagent-driven-development` en la rama `storefront-mvp`
(worktree `.worktrees/storefront-mvp`). Detalle forense completo (qué
encontró cada revisor, qué rulings tomé, qué quedó deliberadamente afuera)
vive en `.superpowers/sdd/2026-10-07-tienda-online-mvp-plan/progress.md`
dentro del worktree — ese archivo no se comitea (está en `.gitignore`), así
que si esta sesión se corta, este `progreso.md` es lo que queda en el repo
para saber dónde seguir.

**Cómo retomar si se corta la sesión:** abrí Claude Code en
`.worktrees/storefront-mvp` (o en la raíz del repo y entrá al worktree),
pedile que lea este archivo + el plan, y que siga con la primera tarea sin
tilde usando `superpowers:subagent-driven-development`.

- [x] **Tarea 1 — Scaffold Next.js 16 + TS + Tailwind v4 + Vitest.** Proyecto
  base movido desde el scaffold temporal, toolchain de testing instalado.
  *(commits `4ea6ebd..77be9ee6`; 1 ronda de fix por un commit que incluía
  `node_modules`/`.next` sin querer, ya corregido)*
- [x] **Tarea 2 — Tokens de diseño (Tailwind `@theme`) + tipografía Poppins.**
  Colores/radios/sombras de DESIGN.md como tokens reales, fuente cargada en
  el layout raíz. *(commits `77be9ee6..db76fa97`; 1 ronda de fix: se
  restauraron clases de layout full-height que se habían perdido)*
- [x] **Tarea 3 — Capa de datos del catálogo.** Tipos, fixture de 3
  productos/3 categorías, adaptador (`getAllProducts`, `getProductBySlug`,
  etc). *(commits `db76fa97..ba477084`; 1 ronda de fix: `getAllProducts`
  devolvía el array interno por referencia)*
- [x] **Tarea 4 — Precio por transferencia.** `computeTransferPrice`
  (10% off, siempre derivado, nunca editable a mano). *(commits
  `ba477084..953cea86`; sin rondas de fix)*
- [x] **Tarea 5 — Zonas de envío.** Tarifas fijas por zona (CABA, resto del
  país, retiro en Vicente López a $0). *(commits `953cea86..f954d841`; sin
  rondas de fix)*
- [x] **Tarea 6 — Primitivas de UI.** `Button`, `TransferPriceBadge`,
  `ProductCard`, `TrustBanner`/`TrustBannerRow` — primer código React real.
  *(commits `f954d841..f0670ad4`; 1 ronda de fix: accesibilidad — `type`
  default del botón, `sizes` de imagen, `aria-label` en swatches, iconos
  decorativos `aria-hidden`, tipo `Tone` duplicado)*
- [x] **Tarea 7 — Header, Footer y layout raíz.** Montados en todas las
  páginas. *(commits `f0670ad4..affed747`; 1 ronda de fix: landmark
  `<main>`, skip-link, `aria-label` de navs, conteo de carrito accesible,
  email como `mailto:`)*
- [x] **Tarea 8 — Home page (dirección "Hero con Gemi, antes/después").**
  Hero + destacados + banners de confianza. *(commits `affed747..1f0bb223`;
  1 ronda de fix: landmark `<main>` anidado — hallazgo que resultó
  sistémico y se corrigió preventivamente en el texto del plan para las
  Tareas 10, 12, 13, 15, 18 y 19 antes de ejecutarlas)*
- [x] **Tarea 9 — Lógica de filtrado y orden del listado.** `sortProducts`
  por precio/nombre. *(commits `1fa87029..09dd1a18`; sin rondas de fix)*
- [x] **Tarea 10 — Página de listado por categoría.** Grilla + filtro +
  orden, 404 para categoría inexistente. *(commits `a5f564b8..60d20c93`;
  1 ronda de fix: salto de jerarquía de encabezados h1→h3, test
  automático del 404, `'use client'` redundante en `SortSelect`)*
- [x] **Tarea 11 — Estado del carrito.** Reducer + persistencia en
  localStorage + `CartProvider`/`useCart`. *(commits `defc7d4e..20a4f81a`;
  1 ronda de fix: los 3 revisores encontraron el mismo bug real de
  hidratación — `loadCart` como lazy-init de `useReducer` hacía que un
  visitante con carrito guardado hidrate distinto al HTML del server;
  se agregó acción `HYDRATE` + guarda de primer render, y validación de
  forma del JSON persistido)*
- [x] **Tarea 12 — Ficha de producto.** Galería, selector de color, precio
  normal + badge de transferencia, agregar al carrito. *(commits
  `f3392e9a..bfff499b`; 1 ronda de fix: selector de color sin
  navegación por teclado (se cambió a `<input type="radio">` nativo),
  `sizes`/`priority`/`alt` en la galería de imágenes; el primer intento
  del fix perdió el aria-label de accesibilidad para no romper un test
  — lo restauré yo mismo ajustando el test a un regex parcial)*
- [x] **Tarea 13 — Página de carrito.** Editar cantidad, quitar, total +
  total por transferencia. *(commits `c946926f..31edd73f`; 1 ronda de
  fix: los 3 revisores encontraron el mismo bug real — vaciar el campo
  de cantidad para reescribirla borraba el ítem sin confirmación
  porque `Number('')` es `0` y el reducer trata cantidad ≤0 como
  "eliminar"; también se perdió cobertura de test del total al
  cambiarla por mocks aislados, se restauró como test de integración
  real)*
- [ ] **Tarea 14 — Guardas de checkout.** Carrito vacío, disponibilidad
  stale (producto agotado después de agregado).
- [ ] **Tarea 15 — Auth gate en checkout (Supabase) + zona de envío.**
  Login/registro exigido solo al pagar.
- [ ] **Tarea 16 — Pedidos.** Tipos, repositorio (in-memory + Supabase),
  `createOrderFromCart`.
- [ ] **Tarea 17 — Mercado Pago.** Preferencia de pago + webhook idempotente.
- [ ] **Tarea 18 — Transferencia/efectivo + confirmación de pedido.**
  Server Action de Mercado Pago, flujo completo de checkout.
- [ ] **Tarea 19 — Páginas de contenido.** Contacto, envíos y pagos, FAQ,
  botón de arrepentimiento (requisito legal en Argentina).
- [ ] **Tarea 20 — SEO.** Metadata, JSON-LD de producto, sitemap.

## Fuera de alcance de este plan (ya documentado en el plan, no son pendientes)

- Panel de administración (CRUD de productos/pedidos) — requiere su propio
  plan.
- Visor 3D de producto — excluido del MVP v1 por la spec aprobada.
- Control de stock por unidad, cálculo automático de envío vía Correo
  Argentino.

## Dato importante para retomar

Antes de ejecutar las Tareas 15-18 hacen falta credenciales reales:
- Un proyecto Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en `.env.local`.
- Una app de Mercado Pago Developers (`MERCADOPAGO_ACCESS_TOKEN`).

Sin esas variables, esas tareas se pueden implementar y testear (la lógica
de negocio está diseñada para testear sin red real), pero el flujo end-to-end
contra servicios reales no se puede verificar hasta tenerlas.
