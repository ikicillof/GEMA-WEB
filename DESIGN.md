# DESIGN.md — Sistema de diseño Gemma

**Estado: dirección pre-build aprobada.** Este documento define los tokens
y componentes que deben guiar la construcción de la tienda, a partir del
brandbook (`docs/Gemma_Branbook. Final.docx`) y de la dirección elegida para
la home (`.impeccable/surfaces/home.md`, dirección "A. Hero con Gemi,
antes/después"). No fue generado todavía a partir de código construido: eso
ocurre en la fase de ejecución (`prompts/03-ejecucion.md`), cuando el
documentador de `impeccable` reconcilie este archivo (y escriba
`.impeccable/design.json`) contra lo que realmente se construyó. Hasta
entonces, este archivo es el contrato que la construcción debe cumplir.

## Tokens de color

Paleta fija del brandbook, máximo 7 colores, cada uno con un rol único.
**Regla de oro: nunca más de 3 colores dominantes por pantalla, además de
negro y blanco.**

```css
:root {
  --color-bg: #0F0F10;        /* negro grafito — fondo base, siempre */
  --color-primary: #FF4DA6;   /* rosa Gemma — primario: CTAs, protagonista */
  --color-secondary: #6D28D9; /* violeta oscuro — secundario, nunca domina */
  --color-accent-cool: #00E6D2; /* turquesa — acento frío, detalle puntual */
  --color-accent-warm: #FFD93D; /* amarillo — acento cálido, detalle puntual */
  --color-rest: #FFB4DB;      /* rosa pastel — descanso visual en piezas saturadas */
  --color-text: #FFFFFF;      /* blanco — texto y contraste sobre negro */
}
```

Uso: `--color-bg` cubre siempre el fondo de página. `--color-primary` es el
único color permitido para la acción principal (CTA de compra). Un
componente nunca combina más de 3 de estos 7 tokens (sin contar
`--color-bg`/`--color-text`) a la vez.

## Tipografía

**Poppins SemiBold (600)** es la tipografía de marca: redondeada, amigable,
moderna. Es el peso por defecto para títulos, CTAs, badges y navegación.

```css
:root {
  --font-family: 'Poppins', sans-serif;
  --font-weight-brand: 600; /* SemiBold — default en toda la UI */

  --text-display: 2.5rem;  /* 40px — hero de home, desktop */
  --text-display-mobile: 2rem; /* 32px — hero de home, mobile */
  --text-h1: 2rem;    /* 32px */
  --text-h2: 1.5rem;  /* 24px */
  --text-h3: 1.125rem; /* 18px */
  --text-body: 1rem;   /* 16px */
  --text-caption: 0.875rem; /* 14px — badges, labels */
  --line-height-tight: 1.15; /* titulares */
  --line-height-body: 1.5;   /* párrafos */
}
```

**Nota abierta (no es desviación de marca, es una decisión de legibilidad a
confirmar):** el brandbook define un único peso (SemiBold). Para párrafos
largos de descripción de producto, propongo permitir Poppins Regular (400)
únicamente en `--text-body` de descripciones extensas, para no perder
legibilidad en bloques de texto largos. Si preferís Poppins SemiBold
también ahí, se quita esta excepción sin impacto en el resto del sistema.

## Radios (corner radius)

Ejecutan la promesa "puffy / gomita": esquinas muy redondeadas, cero
aristas filosas, en todo bloque de interfaz.

```css
:root {
  --radius-sm: 12px;   /* inputs, chips pequeños */
  --radius-md: 20px;   /* botones, badges */
  --radius-lg: 32px;   /* cards de producto, bloques de hero */
  --radius-full: 999px; /* pills: banners de confianza, badge de precio */
}
```

Nunca se usa `border-radius: 0` ni valores menores a `--radius-sm` en
ningún componente de interfaz (excepción única: recortes de foto de
producto que ya vienen con fondo removido).

## Sombras suaves

Las sombras refuerzan el acabado mate "gomita" (nunca brillo de vidrio o
plástico duro): son difusas, de bajo contraste, nunca duras ni con bordes
definidos. Sobre fondo negro, se usan como un leve resplandor de color en
vez de una sombra negra convencional.

```css
:root {
  --shadow-float: 0 4px 16px rgba(15, 15, 16, 0.4); /* elevación base de cualquier card sobre el fondo negro */
  --shadow-glow-primary: 0 8px 28px rgba(255, 77, 166, 0.25); /* CTA primario, hover */
  --shadow-sticker: 0 6px 18px rgba(0, 0, 0, 0.3); /* badges/banners tipo "sticker" flotando */
}
```

## Componentes

### Botón

- **Primario**: fondo `--color-primary`, texto `--color-text`, Poppins
  SemiBold, `--radius-full` (pill), padding generoso (mínimo 14px
  vertical / 28px horizontal), `--shadow-glow-primary` en hover/focus.
  Highlight superior sutil (gradiente blanco al 15% de opacidad en el
  tercio superior) para el efecto glossy/gomita del logo, sin que se vea
  brillo de plástico duro.
- **Secundario**: fondo transparente, borde 2px `--color-secondary`, texto
  `--color-secondary` o `--color-text`, mismo radio y padding que el
  primario. Se usa para acciones que no son la compra (ej. "Ver más").
- Nunca esquinas rectas; nunca sombra dura negra.

### Card de producto

- Fondo levemente más claro que `--color-bg` (ej. `#17171A`) para separarse
  del fondo sin romper la regla de negro siempre como base de página.
- `--radius-lg`, `--shadow-float`.
- Foto de producto arriba (recorte limpio, sin fondo visible más allá del
  propio producto), nombre del producto en Poppins SemiBold, badge de
  precio por transferencia (ver abajo) superpuesto o inmediatamente debajo
  del precio normal.
- Swatches de color: círculos pequeños (20-24px) por cada color disponible
  del producto; el color agotado se muestra atenuado (opacidad ~40%) en vez
  de ocultarse, para que la clienta vea que existió esa opción.
- Hover/focus: `--shadow-glow-primary` leve y elevación de 2-4px, nunca un
  cambio de color de fondo que rompa la paleta.

### Badge de precio por transferencia

- Forma pill (`--radius-full`), fondo `--color-rest` (rosa pastel, su rol
  de "descanso visual" calza con ser información secundaria de apoyo al
  precio principal), texto `--color-bg` (negro grafito) para contraste
  legible sobre el pastel.
- Texto corto y en voz de marca, nunca "10% OFF" corporativo seco: por
  ejemplo "$13.500 x transferencia 💸" o similar tono de amiga, a definir
  con copy real en ejecución.
- `--shadow-sticker` para que se lea como un sticker superpuesto, no como
  parte plana del precio.

### Banners de confianza

- Fila horizontal de chips tipo sticker (uno por promesa: envío, cuotas,
  compra segura, etc., igual contenido funcional que hoy en Empretienda).
- Cada chip: `--radius-full` o `--radius-lg`, ícono + texto corto Poppins
  SemiBold, `--shadow-sticker`.
- Fondo de los chips rotando entre `--color-rest`, `--color-accent-cool` y
  `--color-accent-warm` — nunca los 4 banners con el mismo color, y nunca
  más de 3 colores distintos visibles en la fila completa (regla de los 3
  dominantes).
- En mobile, scroll horizontal con los chips; en desktop, fila fija con
  espaciado uniforme.

### Header

- Fondo `--color-bg` siempre, fijo (sticky) con leve `--shadow-float` al
  hacer scroll para separarse del contenido.
- Isotipo (`public/brand/logo-2.png`) en mobile por espacio reducido;
  logotipo completo (`public/brand/logo-1.png`) en desktop cuando hay
  espacio suficiente para que se lea el nombre completo (regla del
  brandbook).
- Navegación mínima: categorías, buscador (ícono), carrito (ícono con
  badge de cantidad en `--color-primary`).
- Nunca lleva fondo blanco ni claro: el negro grafito es la base también en
  el header.

### Footer

- Fondo `--color-bg`, contenido en `--color-text` y `--color-secondary`
  para links/subtítulos.
- Estructura: medios de pago y envío, redes sociales, contacto, botón de
  arrepentimiento (igual contenido funcional que hoy en Empretienda).
- Decoración sutil del universo Gemma (estrellas gorditas, nubes) como
  elementos gráficos de baja opacidad en los bordes, nunca compitiendo con
  el contenido legal/funcional del footer.
- Tipografía de cuerpo en el footer puede usar Poppins Regular (ver nota de
  tipografía) dado que es texto denso informativo, no un titular de marca.

## Direcciones de home consideradas

Se evaluaron 3 composiciones para el primer viewport de la home (paleta,
tipografía y mascota ya fijas por el brandbook en las tres; lo que varía es
la estructura). Detalle completo de las 3 y el proceso de selección en
`.impeccable/surfaces/home.md`.

- **A. Hero con Gemi, antes/después — elegida.** Split hero: mitad texto +
  CTA, mitad escena de "rincón de casa" con Gemi señalando el producto;
  scroll funde la versión apagada del rincón a la versión a color.
- **B. Vidriera de rincones (descartada).** Home recorrida como snap-scroll
  entre "rincones" de casa (escritorio, entrada, mesa de luz), cada uno con
  su producto protagonista.
- **C. La puerta Gemma, umbral de scroll (descartada).** La puerta Gemma
  ocupa el primer viewport y se "abre" con el scroll para revelar el
  catálogo.

## Próximos pasos

Este documento cubre tokens y componentes a nivel sistema. La construcción
real de la home con estos tokens, su reconciliación final en este mismo
archivo junto con `.impeccable/design.json`, y la revisión de calidad
(hook de detección, finish review) ocurren en `prompts/03-ejecucion.md`,
después de `prompts/02-plan-y-scaffold.md`.
