# Prompt 2 — Plan y scaffold (superpowers writing-plans)

```
Usá superpowers:writing-plans con el spec aprobado y DESIGN.md.
Antes de escribir código, leé la guía de Next.js en node_modules/next/dist/docs/
(esta versión tiene cambios de API respecto de lo que conocés).

Stack propuesto: Next.js App Router + TypeScript estricto + Tailwind v4
con los tokens de DESIGN.md + Poppins vía next/font. Datos de catálogo
en src/data/products.json tipado (id, slug, nombre, descripción,
categoría, precio, variantes de color, fotos, stock, modelo3d opcional),
con adaptador en lib/ para poder migrar a un CMS después.

Plan en tareas chicas y verificables, con orden:
1. scaffold + tokens + layout + Header/Footer
2. home (hero, destacados, banners de confianza, Gemi)
3. listado con filtros por categoría/colección y orden
4. ficha de producto (galería, variantes, precio normal y precio por transferencia -10%)
5. carrito (estado persistente) + checkout
6. páginas: contacto, envíos y pagos, botón de arrepentimiento (obligatorio en Argentina), FAQ
7. SEO (metadata, JSON-LD Product, sitemap)
8. visor 3D opcional
Guardá el plan en docs/superpowers/plans/ y esperá mi OK.
```
