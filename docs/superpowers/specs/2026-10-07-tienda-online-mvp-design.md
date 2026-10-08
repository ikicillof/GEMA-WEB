# Tienda online Gemma — Diseño del MVP

- **Fecha:** 2026-10-07
- **Estado:** Aprobado por el usuario, pendiente de plan de implementación.
- **Repo:** `gema-web` (este repositorio).
- **Prompt origen:** `prompts/00-fundamentos.md`.

## 1. Contexto e intención

Gemma vende hoy objetos de diseño de impresión 3D para el hogar a través de
Empretienda (https://gemmanoname.empretienda.com.ar/). El objetivo de este
proyecto es reemplazar esa tienda por una web propia, con identidad de marca
100% fiel al brandbook (`docs/Gemma_Branbook. Final.docx`), mobile-first, para
una clienta de 25-38 años que descubre productos por Instagram/Pinterest y
compra por impulso emocional ("quiero que mi casa se sienta más mía"), no por
necesidad funcional.

La dirección visual (colores, tipografía, layout, componentes) se define en un
proceso separado con `impeccable` (`prompts/01-direccion-de-diseno.md`) y no es
parte de esta spec. Esta spec define **qué construye el sistema y cómo**, no
**cómo se ve**.

### Referencia funcional (Empretienda, estado actual)

- Categorías: Productos > General > (Gemma / NONAME).
- Grilla de producto: precio normal + precio con 10% off pagando por
  transferencia.
- Banners de confianza: envío a todo el país, compra sin salir de casa, hasta
  12 cuotas con todas las tarjetas, compra segura.
- Envío por Correo Argentino / Acordar, retiro en sucursales o en punto
  propio (Vicente López).
- Pago con Mercado Pago, transferencia (alias/CVU), efectivo, Acordar.
- Checkout exige cuenta registrada. Footer con botón de arrepentimiento,
  medios de pago/envío, redes e email de contacto.

### Éxito para este MVP

La clienta puede: descubrir productos por categoría, entender el precio real
según medio de pago, armar un carrito sin fricción, y pagar online con tarjeta
o coordinar transferencia/efectivo — todo sin tener que escribirle a Gemma por
WhatsApp para comprar. Gemma puede: cargar/editar productos y gestionar
pedidos sin depender de un programador para el día a día.

## 2. Decisiones de alcance (resumen de brainstorming)

| Tema | Decisión |
|---|---|
| Alcance MVP | E-commerce completo: catálogo + carrito + checkout + pago online, no pedido manual por WhatsApp. |
| Medios de pago | Mercado Pago Checkout Pro (tarjetas, hasta 12 cuotas) + transferencia/efectivo con 10% off, confirmados manualmente por Gemma. |
| Carga de productos | Panel de administración propio, a medida, dentro de la misma web. |
| Envío | Tarifas fijas por zona (no integración con API de Correo Argentino), incluye retiro en Vicente López como zona a $0. |
| Stock | Sin control de stock por unidad en este MVP. Un producto/color se marca `disponible` o `agotado` a mano. |
| Visor 3D | Fuera del MVP. Se usan fotos, igual que hoy. |
| Cuentas | Navegación y carrito libres sin cuenta. Login/registro se exige únicamente al llegar al paso de pago. |

## 3. Enfoque técnico

**Next.js (App Router) como única aplicación**, cubriendo tienda pública y
panel de administración, desplegada en Vercel. **Supabase** provee Postgres
(datos), Auth (login de Gemma como admin y de la clienta al pagar) y Storage
(fotos de producto). **Mercado Pago Checkout Pro** maneja el pago con
tarjeta vía redirect + webhook de confirmación.

Se evaluaron y descartaron dos alternativas:

- **Backend separado del frontend** (p. ej. Astro + API aparte): suma
  complejidad de despliegue y mantenimiento sin un beneficio claro para el
  volumen de esta tienda.
- **Plataforma de e-commerce lista** (p. ej. Medusa.js auto-hosteada): trae
  funciones de fábrica (carrito, admin, inventario) pero contradice el pedido
  explícito de un panel de administración "a medida", y es más pesada de
  alojar y personalizar a fondo que construir el panel propio sobre Next.js.

Justificación de la opción elegida: un solo código para tienda + admin +
pagos simplifica el desarrollo y el mantenimiento; Supabase evita escribir
desde cero autenticación, base de datos y almacenamiento de imágenes; y
Next.js da buen rendimiento mobile y SEO, relevante porque la clienta llega
también buscando en Google además de Instagram/Pinterest.

## 4. Arquitectura

Dos superficies dentro de la misma app:

- **Tienda pública** (`/`, `/categoria/:slug`, `/producto/:slug`, `/carrito`,
  `/checkout`): navegable sin cuenta.
- **Panel admin** (`/admin/*`, protegido por Supabase Auth con rol de
  administradora): gestión de productos, pedidos y zonas de envío. No es
  público ni autogestionable por clientas.

Flujo de datos entre piezas:

```
Clienta (mobile) → Next.js (SSR/ISR para catálogo, client-side para carrito)
                 → API routes / Server Actions → Supabase Postgres
                 → Mercado Pago Checkout Pro (redirect de pago)
                 ← Webhook de Mercado Pago → actualiza estado del pedido
Gemma (admin)    → /admin → Supabase Auth → CRUD productos/pedidos/zonas
```

## 5. Modelo de datos

- **Product**: `nombre`, `descripcion`, `categoria_id`, `precio`,
  `precio_transferencia` (= `precio * 0.9`, calculado, no editable a mano),
  `fotos[]`, `colores[]` (lista de `{nombre, foto?, estado: disponible|agotado}`,
  sin contador de unidades), `estado_general` (`disponible`/`agotado`, para
  ocultar el producto entero si no tiene ningún color disponible).
- **Category**: `nombre`, `slug`, `orden`.
- **ShippingZone**: `nombre`, `tarifa`, `orden`. Incluye una zona
  "Retiro en Vicente López" con `tarifa = 0`.
- **Order**: `items[]` (`producto_id`, `color`, `cantidad`, `precio_unitario`
  al momento de compra), `zona_envio_id`, `direccion`, `metodo_pago`
  (`mercado_pago`/`transferencia`/`efectivo`), `estado_pago`
  (`pendiente`/`pagado`/`rechazado`), `estado_envio`
  (`a_confirmar`/`enviado`), `cliente_id`, `creado_en`.
- **Customer**: creado en Supabase Auth en el momento de pagar (si no existía
  previamente); guarda email/teléfono y dirección para futuras compras.

El precio por transferencia nunca se tipea a mano: siempre se deriva del
precio base para evitar inconsistencias entre ambos valores.

## 6. Flujo de compra

1. Home o categoría → grilla con precio normal y precio transferencia.
2. Página de producto: fotos, selector de color (deshabilitado si ese color
   está `agotado`), botón "agregar al carrito".
3. Carrito: editable (cantidad, eliminar ítem), visible sin necesidad de
   cuenta.
4. Checkout, paso 1: dirección + selección de zona de envío (tarifa fija,
   incluye retiro en Vicente López a $0).
5. Checkout, paso 2: **acá se exige iniciar sesión o registrarse** (no antes).
6. Checkout, paso 3: elegir método de pago.
   - Mercado Pago → redirect a Checkout Pro → vuelve con estado de pago.
   - Transferencia/efectivo → se muestran instrucciones (alias/CVU o punto de
     retiro de efectivo) y el pedido queda `pendiente` hasta que Gemma lo
     confirma a mano en el panel.
7. Confirmación de pedido → el pedido queda visible en el panel admin con su
   estado correspondiente.

## 7. Panel de administración

- Login propio de Gemma vía Supabase Auth (rol admin), no accesible
  públicamente.
- CRUD de productos: alta/edición/baja, carga de fotos (Supabase Storage),
  gestión de colores y su estado `disponible`/`agotado` (toggle simple, sin
  cantidades).
- Listado de pedidos filtrable por `estado_pago`/`estado_envio`, con acción
  para marcar manualmente un pedido como `pagado` (transferencia/efectivo) y
  como `enviado`.
- Gestión de zonas de envío: alta/edición de zona y tarifa, orden de
  visualización.

## 8. Manejo de errores

- **Pago rechazado en Mercado Pago**: se muestra un mensaje claro y el
  carrito se conserva para reintentar; el pedido queda en `rechazado` si
  llegó a crearse, sin bloquear un nuevo intento.
- **Webhook de Mercado Pago no llega o falla**: el pedido queda en
  `pendiente` visible en el panel admin para revisión manual; no se asume
  pago confirmado sin la señal del webhook.
- **Producto/color sin stock**: se oculta o deshabilita el botón de compra
  para ese color específico antes de que la clienta pueda agregarlo al
  carrito, en vez de avisar después en el checkout.
- **Carga de fotos en el panel**: se valida formato y tamaño antes de subir a
  Storage, con mensaje de error específico si falla.

## 9. Testing

Para este MVP, los tests se concentran en la lógica crítica de negocio, no en
cobertura exhaustiva de UI:

- Cálculo de `precio_transferencia` (siempre 10% off del precio base).
- Cálculo de total de envío según zona seleccionada.
- Creación de pedido a partir del carrito (totales, items, estado inicial).
- Actualización de estado de pedido a partir del webhook de Mercado Pago
  (pagado/rechazado).

El detalle de metodología (TDD estricto, qué se automatiza vs. qué queda como
smoke test manual) se define en la fase de ejecución
(`prompts/03-ejecucion.md`, con `superpowers:test-driven-development`), no en
esta spec.

## 10. Explícitamente fuera de alcance (v1)

- Visor 3D interactivo de productos.
- Control de stock por unidad/cantidad.
- Cálculo automático de envío contra la API de Correo Argentino.
- Historial de pedidos elaborado para la clienta (más allá de la confirmación
  básica).
- Multi-idioma / multi-moneda.
- Reseñas de producto, programa de puntos o fidelización.

Estos ítems quedan anotados como candidatos para una v2, pero no deben
agregarse durante la implementación del MVP sin pasar antes por su propio
brainstorming.
