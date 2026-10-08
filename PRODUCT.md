# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Mercado Pago
Checkout Pro, desplegado en Vercel. Decisión explícita del usuario,
registrada en `docs/superpowers/specs/2026-10-07-tienda-online-mvp-design.md`
tras comparar con un backend separado y con una plataforma de e-commerce
lista (ambas descartadas).

## Users

Mujer de 25 a 38 años. Vive sola, en pareja o con roomie, en etapa de armar o
renovar su espacio de a poco — sumando piezas con intención, no todo de una
vez. Sigue cuentas de decoración e ilustración en Instagram y Pinterest: le
gusta lo colorido, pero no lo caótico. Tiene trabajo estable; la compra en
Gemma es un gasto pensado ("me lo merezco" con criterio), ni la más barata ni
un lujo. Compra para renovarle personalidad a un rincón puntual (escritorio,
mesa de luz, entrada) o como regalo para amigas con el mismo gusto. La mueve
"quiero que mi casa se sienta más mía", no una necesidad funcional.

## Product Purpose

Vender objetos de diseño de impresión 3D para el hogar (lámparas,
calendarios perpetuos, estantes, porta llaves, soportes para notebook,
figuras, relojes) a través de una tienda online propia, con identidad de
marca 100% fiel al brandbook, que reemplaza la presencia actual en
Empretienda (https://gemmanoname.empretienda.com.ar/) con mejor experiencia
y más fidelidad visual.

## Positioning

Objetos con personalidad (Kitsch / Pop Art / Memphis / Pinterest colorido)
que transforman un rincón cotidiano en algo que se siente más "hogar". La
meta explícita de marca es que, al recomendar un producto, la gente diga
"Es de Gemma" en vez de "qué lindo organizador" — un posicionamiento
emocional y estético que una tienda de decoración genérica no puede copiar
con honestidad.

## Operating Context

Flujo de compra sin cuenta obligatoria hasta el momento de pagar: catálogo
por categorías → grilla con precio normal y precio por transferencia (10%
off) → página de producto con selector de color → carrito editable →
checkout con selección de zona de envío a tarifa fija (incluye retiro en
Vicente López a $0) → login/registro exigido recién en este punto → pago con
Mercado Pago Checkout Pro o transferencia/efectivo confirmado a mano por
Gemma. Panel de administración propio (no público) para que Gemma cargue
productos, gestione pedidos y zonas de envío sin depender de un programador
para el día a día.

## Capabilities and Constraints

Detalle completo en `docs/superpowers/specs/2026-10-07-tienda-online-mvp-design.md`.
Para este MVP, explícitamente fuera de alcance: visor 3D interactivo de
producto, control de stock por unidad/cantidad (se usa un toggle manual
disponible/agotado por color), cálculo automático de envío contra la API de
Correo Argentino, historial de pedidos elaborado para la clienta,
multi-idioma/multi-moneda, reseñas de producto, programa de puntos. El
precio por transferencia siempre se deriva automáticamente como 10% menos
del precio base; nunca se tipea a mano.

## Brand Commitments

Marca "Gemma" — "Hacemos que cada rincón brille." Fuente de verdad completa
en `docs/Gemma_Branbook. Final.docx`; logos reales en `public/brand/`
(`logo-1.png` logotipo completo, `logo-2.png` isotipo).

- Voz: tuteo siempre, frases cortas, calidez de amiga compartiendo un
  hallazgo (no de vendedora), un emoji o dos (nunca lluvia de emojis), humor
  suave permitido, nunca lenguaje corporativo.
- Mascota **Gemi**: guardiana del color, no es la marca sino su personaje.
  Forma de gema/cristal achatado con facetas suavizadas (nunca filosas);
  cuerpo rosa Gemma (#FF4DA6), manos/pies violeta oscuro (#6D28D9) como
  único acento, mejillas violeta suave, textura mate tipo gomita (nunca
  brillo de vidrio/plástico duro), ojos abiertos con expresión calma y
  curiosa. Tierna, no infantil: siempre acompañada de un ancla de "casa de
  adulto" (planta, lámpara, repisa de madera, taza de café); nunca en
  contextos de cuarto infantil o con juguetes. 5 expresiones sobre la misma
  forma/colores base (feliz, guiño, sorprendida, pensativa, relajada).
- Paleta fija, máximo 7 colores con rol definido, nunca más de 3 colores
  dominantes por pieza además de negro y blanco:
  - `#0F0F10` negro grafito — fondo base, siempre.
  - `#FF4DA6` rosa Gemma — primario, CTAs, protagonista.
  - `#6D28D9` violeta oscuro — secundario, balance, nunca domina.
  - `#00E6D2` turquesa — acento frío, detalle puntual.
  - `#FFD93D` amarillo — acento cálido, detalle puntual.
  - `#FFB4DB` rosa pastel — descanso visual en piezas saturadas.
  - `#FFFFFF` blanco — texto y contraste sobre negro.
- Tipografía: Poppins SemiBold (redondeada, amigable, moderna).
- Estilo: mezcla de Kitsch, Pop Art, Memphis, Pinterest colorido y diseño
  contemporáneo. Nunca vintage, nunca infantil, nunca maximalismo caótico,
  nunca minimalismo frío ni luces blancas frías.
- Promesa visual "puffy / gomita / nube": todo debe parecer abrazable pese a
  ser impresión 3D rígida — esquinas muy redondeadas, ausencia de aristas
  filosas, acabado mate (no brillo de vidrio/plástico duro).
- Elementos del universo: estrellas gorditas, nubes mullidas, ondas, gotas,
  corazones, chupetines, algodón de azúcar, burbujas, damero, puertas,
  casas curvas, árboles redondos, faroles. La "puerta Gemma" es el símbolo
  central de la marca y aparece con frecuencia en piezas de comunicación.

## Evidence on Hand

Brandbook completo con paleta, voz, personaje Gemi y reglas de uso de logo
(`docs/Gemma_Branbook. Final.docx`). Logos reales en `public/brand/`.
Catálogo funcional de referencia vivo en
https://gemmanoname.empretienda.com.ar/ (categorías, grilla con precio
normal/transferencia, banners de confianza, envíos, medios de pago —
relevado y documentado en `prompts/README.md`). Spec de producto/arquitectura
aprobada en `docs/superpowers/specs/2026-10-07-tienda-online-mvp-design.md`.
No hay todavía fotos ni copys reales de producto cargados en este repo: no
inventar productos, precios ni testimonios — ese contenido lo aporta Gemma
en la fase de carga de contenido.

## Product Principles

1. Cada decisión de producto y de diseño se filtra por una frase: que el
   resultado final provoque "Es de Gemma", no "qué lindo organizador".
2. Calidez de amiga, no de vendedora, en cada texto de la interfaz — la voz
   es tan parte del diseño como el color.
3. Fidelidad a la paleta y las reglas de marca por sobre las convenciones
   genéricas de e-commerce.
4. Reducir fricción de compra (sin cuenta obligatoria hasta pagar) por
   sobre acumular funcionalidades.
5. YAGNI: nada fuera del alcance aprobado del MVP entra sin pasar antes por
   su propio proceso de decisión.
