# Estado de la rama `backend`

Última actualización: 19/10/2026. Este documento no contiene valores de claves ni secretos; solo nombres de variables.

## Qué está terminado

| Área | Qué hay | Cómo se prueba |
|---|---|---|
| Servidor en Netlify | `next.config.mjs` sin export estático, `netlify.toml` con `@netlify/plugin-nextjs`, Node 22, cabeceras de seguridad. Producto inexistente = 404 real. | Deploy de la rama |
| Firebase | Proyecto `gemma-web-55f79`. Cliente (`lib/firebase/client.ts`) y Admin (`lib/firebase/admin.ts`). | `npm run test:firebase-admin`, `npm run test:firebase-client` |
| Login y roles | Google y email/contraseña (verificación y recuperación). Roles creador > admin > colaborador > cliente como custom claims. `CREATOR_EMAIL` define al creador. Reglas en `firestore.rules`. | `npm run test:auth` (necesita el email de creador como 2.º argumento) |
| Catálogo en Firestore | Colección `products/{slug}`, lectura en servidor con caché, respaldo en `lib/catalogo-inicial.ts`. | `npm run migrar:catalogo` |
| Checkout | Datos de envío en la cuenta, carrito en la cuenta (`carritos/{uid}`), cotización MiCorreo (modo simulado sin credenciales), resumen calculado en servidor. | `npm run test:checkout` |
| Pagos | Mercado Pago (Checkout Pro) y transferencia. Ventas en `orders` con estados `pendiente_pago`, `pagado`, `transferencia_en_proceso`, `completado`, `cancelado`. Webhook `POST /api/mercadopago/webhook` con firma `x-signature`, consulta del pago real, idempotente, nunca retrocede una venta pagada. Confirmación en `/checkout/resultado`. «Mis compras» con compras reales. | `npm run test:pagos`, `scripts/test-pedido.mjs` |
| Datos de prueba | Ventas y carritos creados con credenciales de prueba llevan `modoPrueba: true`. | `npm run limpiar:pruebas` (simulacro) y `npm run limpiar:pruebas -- --confirmar` (borra) |
| Pago directo | Sin «Guardar y continuar»: dos botones al final del formulario («Pagar con Mercado Pago» / «Pagar por transferencia»). Validan, guardan los datos en la cuenta y crean la venta en un paso, con doble toque bloqueado. Incompletos: rebotan en su lugar, marcan lo que falta y llevan al primer campo incompleto (con teclado no rebotan, solo llevan el foco). Sin cotización de envío quedan deshabilitados. | Manual |
| Pantalla de carga | `<CargaGemma mensaje="…" />` (`components/carga-gemma.tsx`): logo + Gemi + estrellitas sobre crema, completa o `compacta`. No aparece si la espera dura menos de 300 ms y, una vez visible, queda al menos 500 ms. Se usa en `loading.tsx`, checkout, resultado, Mis compras y login. Capturas en `docs/capturas/`. | Manual |

Arreglo importante: `package.json` fuerza `jwks-rsa` 3.x dentro de `firebase-admin` (`overrides`). Con la versión 4 las funciones de Netlify fallaban con `ERR_REQUIRE_ESM`. Al actualizar `firebase-admin`, revisar si el arreglo sigue siendo necesario.

## Netlify (sitio `gemmaweb`, branch deploy de `backend`)

URL: https://backend--gemmaweb.netlify.app (el deploy está publicado y responde: tienda, fichas, 404 de producto inexistente, `/api/pedidos` con sesión y resumen del checkout).

Todas las variables están cargadas solo con contexto **Branch deploys**; ninguna está en Production.

Cargadas, no secretas: `SITE_URL`, `PAGOS_MODO_PRUEBA`, `MICORREO_MODO` (simulado), `CREATOR_EMAIL`, `FIREBASE_PROJECT_ID`, las siete `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.

Cargadas, secretas: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`.

**Faltan:**
- `MERCADOPAGO_WEBHOOK_SECRET` (secreta). Sin ella el webhook responde 503 a todo.
- `MICORREO_USER` y `MICORREO_PASSWORD` (secretas), `MICORREO_CUSTOMER_ID`, `MICORREO_ORIGIN_CP` y `MICORREO_BASE_URL`. Sin ellas el envío queda en cotización simulada.
- Cargadas el 19/10/2026 (solo Branch deploys): `RESEND_API_KEY` (secreta), `RESEND_FROM_EMAIL` (`Gemma <hola@gemma-oficial.com.ar>`) y `RESEND_REPLY_TO` (provisorio: email de Iván; reemplazar por el de la tienda).
- Opcional: variables de Cloudinary (todavía no se usan).

Fuera de Netlify:
- Agregar `backend--gemmaweb.netlify.app` en Firebase Auth → Authorized domains (sin eso el login del deploy no funciona).
- Cargar en Mercado Pago el webhook `https://backend--gemmaweb.netlify.app/api/mercadopago/webhook` para el evento Pagos, y copiar su clave secreta a Netlify.

## Mails de venta (Resend)

Plantillas React Email en `emails/`, armado y envío en `lib/mail-core.ts` y `lib/server/emails.ts`. Tres mails: aviso a la dueña (a `configuracion/general.emailAvisos`) y confirmación al cliente cuando se aprueba un pago de Mercado Pago o se crea una venta por transferencia; y «Recibimos tu transferencia» al cliente cuando se completa. Con venta de prueba el asunto lleva `[PRUEBA]`. Si Resend falla, la venta se guarda igual y el error queda en `orders/{id}.emails.<tipo>` con `mailsPendientes: true`; `POST /api/admin/mails/reintentar` (admin) los reintenta. `POST /api/admin/pedidos/{id}/completar` (admin) completa una transferencia y manda el mail. El link «Ver la venta en el panel» apunta a `/admin/ventas/{id}`, que todavía no existe. Ejemplos: `npm run mails:ejemplo -- tu@email.com`.

**Estado al 19/10/2026:** Resend rechaza el envío con «The gemma-oficial.com.ar domain is not verified». Hay que revisar en resend.com/domains que el dominio figure Verified en la misma cuenta/equipo que la API key.

## Pendiente

1. Cargar `MERCADOPAGO_WEBHOOK_SECRET` y redeployar (commit vacío o «Clear cache and deploy»).
2. Probar un pago real de prueba de punta a punta: pagar en Mercado Pago, volver a `/checkout/resultado` y ver el webhook marcando `pagado`. Hasta ahora el flujo se probó solo con un Mercado Pago simulado; nunca contra la API real ni con los avisos reales.
3. Credenciales de MiCorreo y verificar el formato real de la API (`lib/server/micorreo.ts`); hoy la cotización es simulada.
4. **Reemplazar los datos provisorios** de `configuracion/general` (cargados con `npm run seed:firestore`, marcados `datosProvisorios: true`): `datosTransferencia` (mapa con `alias`, `titular`, `banco`; hoy son de EJEMPLO: `gemma.tienda.ejemplo`, «Titular de ejemplo», «Banco de ejemplo», con `provisorio: true`), `whatsapp` (hoy el número que ya estaba en el código, `5491128397462`, a confirmar) y `emailAvisos` (hoy el email de Iván, para los avisos que se hagan con Resend). Al cargar los reales, borrar `provisorio` y `datosProvisorios`; mientras `provisorio` sea true, la página de transferencia avisa que son datos de ejemplo. Los cambios tardan hasta 1 minuto en verse (caché).
5. Definir el descuento por transferencia real (hoy 10 %, valor provisorio en `configuracion/general.descuentoTransferenciaPct`).
6. Pesos y medidas reales de los productos (hoy provisorios, marca `medidasProvisorias`).
7. Antes de publicar en producción: `npm run limpiar:pruebas -- --confirmar`. Se comparte el mismo proyecto Firebase entre pruebas y producción.
8. Si se usa la misma cuenta en rama y producción, el carrito de producción puede quedar marcado como de prueba y borrarse con la limpieza.

## Próximo paso recomendado

Cargar la clave secreta del webhook, redeployar y hacer la primera compra de prueba real con la cuenta de vendedor de prueba. Después: panel de administración (ventas, catálogo; debe llamar `revalidarCatalogo()`), cambio de estado a `completado`, avisos por email (Resend) y visor 3D con botón «Ver en 3D» (`modelo3d` ya está en `perro-globo`, falta pasarlo a la ficha). No se mergea a `main` hasta cerrar la prueba de pagos.

## Otras deudas conocidas

- Next 14 tiene vulnerabilidades reportadas por `npm audit` (preexistentes); conviene actualizar.
- Contraste bajo en algunos textos de tienda, fichas y contacto (`.shop-count`, `.breadcrumbs`, `.detail-note`, `.contact-card span`).
- El servidor de desarrollo (`next dev`) se queda sin memoria en esta máquina al compilar la home; para pruebas se usa `next build` + `next start`.
