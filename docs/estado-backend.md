# Estado de la rama `backend`

Última actualización: 20/10/2026. Este documento no contiene valores de claves ni secretos; solo nombres de variables.

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
- Cargadas el 20/10/2026 (solo Branch deploys): `RESEND_API_KEY` (secreta), `RESEND_FROM_EMAIL` (`Gemma <hola@gemma-oficial.com.ar>`) y `RESEND_REPLY_TO` (provisorio: email de Iván; reemplazar por el de la tienda). El 20/10 se comprobó que no estaban en Netlify (aunque este doc decía que sí) y se cargaron de nuevo.
- Novedades por email, cargadas el 20/10/2026 (solo Branch deploys, secretas): `NOVEDADES_SECRET` (autentica la función de fondo) y `NOVEDADES_TOKEN_SECRET` (firma los links «Darme de baja»; si se cambia, los links de mails ya enviados dejan de valer). Opcionales: `RESEND_LIMITE_DIARIO` (por defecto 100, el plan gratuito) y `NOVEDADES_RESERVA_VENTAS` (por defecto 20 mails por día que las novedades NO usan, para que nunca le quiten lugar a un mail de venta).
- Cloudinary, cargadas el 20/10/2026 (solo Branch deploys): `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` (secreta). Las usa el panel para subir fotos de productos.

Fuera de Netlify:
- Agregar `backend--gemmaweb.netlify.app` en Firebase Auth → Authorized domains (sin eso el login del deploy no funciona).
- Cargar en Mercado Pago el webhook `https://backend--gemmaweb.netlify.app/api/mercadopago/webhook` para el evento Pagos, y copiar su clave secreta a Netlify.

## Mails de venta (Resend)

Plantillas React Email en `emails/`, armado y envío en `lib/mail-core.ts` y `lib/server/emails.ts`. Tres mails: aviso a la dueña (a `configuracion/general.emailAvisos`) y confirmación al cliente cuando se aprueba un pago de Mercado Pago o se crea una venta por transferencia; y «Recibimos tu transferencia» al cliente cuando se completa. Con venta de prueba el asunto lleva `[PRUEBA]`. Si Resend falla, la venta se guarda igual y el error queda en `orders/{id}.emails.<tipo>` con `mailsPendientes: true`; `POST /api/admin/mails/reintentar` (admin) los reintenta. `POST /api/admin/pedidos/{id}/completar` (admin) completa una transferencia y manda el mail. El link «Ver la venta en el panel» apunta a `/admin/ventas/{id}` (ya existe, ver «Panel de administración»). Ejemplos: `npm run mails:ejemplo -- tu@email.com`.

**Estado al 19/10/2026:** Resend rechaza el envío con «The gemma-oficial.com.ar domain is not verified». Hay que revisar en resend.com/domains que el dominio figure Verified en la misma cuenta/equipo que la API key.

## Panel de administración (`/admin`)

Link «Panel» en el menú de usuario (solo para creador, admin y colaborador). Estilo del brand book, pensado para el celular, con `CargaGemma` en las esperas.

**Cómo se protege.** `lib/server/admin.ts` (`exigirStaff`) es la puerta de TODA ruta `/api/admin/*`: límite por IP, ID token válido, rol leído FRESCO desde Firebase (no del token), rol mínimo y, para colaboradores, el permiso puntual. Quien no es del equipo recibe 404 (no se revela el panel); un colaborador sin permiso, 403. En la interfaz, `components/admin/admin-shell.tsx` le pregunta al servidor quién es la persona (`GET /api/admin/yo`) en cada página y cada cambio de ruta; si no es del equipo muestra la 404 y no pide ningún dato. Ocultar botones es solo comodidad: la protección real es el servidor. Todo cambio queda en la colección `auditoria`.

| Sección | Qué permite | Quién |
|---|---|---|
| Ventas (`/admin/ventas`, `/admin/ventas/{id}`) | Lista con filtros (estado, método de pago, fecha) y buscador por n.º de pedido o cliente. Marca «Prueba» (`modoPrueba`), destaca `requiereRevision` y `mailsPendientes`. Detalle con productos, cliente, envío, total e historial. Reintentar mails, «Marcar como completada» (transferencias, con confirmación) y cancelar con motivo (solo ventas sin cobrar). | Ver: colaborador con `ventas:ver`. Modificar: admin o creador. |
| Productos (`/admin/productos`) | Lista con buscador y filtros (categoría, visible/oculto). Alta, edición, ocultar y eliminar (con confirmación). Colores con selector, fotos a Cloudinary (firma del servidor, orden por arrastre o flechas, vista previa), modelo 3D (.glb) opcional. Aviso de «Medidas provisorias»: se apaga al guardar medidas nuevas y completas o al tildar «son las medidas reales». Cada cambio llama a `revalidarCatalogo()`. | Ver: colaborador con `productos:ver`. Modificar: admin o creador. |
| Equipo (`/admin/equipo`) | Lista de personas con acceso y su rol. Sumar colaboradores por el email de una cuenta ya registrada y con email verificado, y quitarlos; cambiar sus permisos. El creador además suma y quita admins. Nadie modifica al creador ni a sí mismo. | Admin o creador (el resto ve la 404). |
| Configuración (`/admin/configuracion`) | Descuento por transferencia, datos de transferencia (al guardar un alias distinto del de ejemplo se apaga el aviso de provisorio), WhatsApp y email de avisos. | Admin o creador (el resto ve la 404). |

Fotos: el navegador pide una firma a `POST /api/admin/uploads/firma` (carpeta y formatos fijos, vence en minutos) y sube directo a Cloudinary; el API Secret nunca sale del servidor. Se probó el 20/10 una subida firmada real (aceptada) y una con la carpeta cambiada (rechazada con 401).

**Límites conocidos del panel:**
- No hay cookie de sesión (Firebase vive en el navegador), así que las páginas `/admin/*` responden 200 con la 404 dibujada; los datos nunca viajan sin pasar por la API verificada.
- El límite por IP es en memoria (mejor esfuerzo en funciones serverless). Decisión: alcanza por ahora.
- `modelo3d` se guarda con el producto, pero la ficha de la tienda todavía no lo lee ni muestra «Ver en 3D».
- Eliminar productos y cancelar ventas piden confirmación en la interfaz (decisión: alcanza).
- En esta máquina `next build` se queda sin memoria si hay muchos programas abiertos: usar `NODE_OPTIONS=--max-old-space-size=1536 npx next build --no-lint`. ESLint no está configurado en el repo (`next lint` abre un asistente).

**Para probar con cada rol** (cuentas con email verificado; el cambio de rol corta la sesión, hay que volver a ingresar):
1. Cliente (o sin sesión): `/admin` y `/admin/ventas` muestran la 404; el menú no tiene «Panel».
2. Colaborador con ambos permisos: ve Ventas y Productos solo para mirar (sin botones de modificar); Equipo y Configuración dan 404.
3. Colaborador solo con `ventas:ver`: Productos muestra «No tenés permiso».
4. Admin: puede todo menos tocar admins y al creador; en Equipo solo suma y quita colaboradores.
5. Creador: además suma y quita admins.

## Novedades por email

**Cómo se consiente.** En el login (Google o email) hay una casilla «Quiero recibir novedades de Gemma por email», arriba de las opciones y siempre destildada al abrir. `POST /api/auth/sync` crea el perfil con `recibeNovedades` según la casilla, **solo al crearlo**; una cuenta que ya existe nunca cambia lo que había elegido (para eso está «Mi cuenta», `/mi-cuenta`, también en el menú de usuario). El perfil guarda `novedadesPreguntadas` (solo escribe el servidor). A quien entra con Google sin tildar la casilla se le muestra **una sola vez**, abajo de la pantalla, «¿Querés enterarte de las novedades de Gemma?» con «Sí, quiero» / «No, gracias»; cualquier respuesta se guarda en el perfil y no vuelve a salir. Decisión: ese aviso también les sale una vez a las cuentas de Google que ya existían y nunca respondieron; su valor solo cambia si ellas contestan «Sí». Los usuarios existentes no se tocaron.

**Baja.** Cada mail trae «Darme de baja» → `/baja?t=…` (sin login, token firmado con HMAC; no vence). Al abrir el link la persona queda de baja y ve la confirmación, con «Me equivoqué» para volver. También lleva los encabezados `List-Unsubscribe` (baja con un clic de Gmail/Apple Mail, `POST /api/novedades/baja?t=…`). Nota: como la baja ocurre al abrir el link, un antivirus de mail que abra los links de antemano podría dar de baja a alguien; el «Me equivoqué» lo cubre.

**Envío desde el panel** (`/admin/novedades`, solo creador y admin): asunto, mensaje con formato básico (`**negrita**`, `[texto](https://link)`, saltos de línea; **no se acepta HTML**), imagen opcional (Cloudinary), vista previa con la misma plantilla de los mails de venta, «Enviarme una prueba», confirmación con la cantidad de destinatarios, e historial (fecha, asunto, enviados, pendientes, con error, bajas y estado) que se actualiza solo mientras hay un envío en marcha.

**Cómo se manda.** Al confirmar, la web congela la lista de destinatarios (solo `recibeNovedades: true` **y email verificado en Firebase Auth**: sin verificar, alguien podría haber registrado el email de otra persona), guarda el mail ya armado en `novedades/{id}` y despierta la función de fondo `netlify/functions/novedades-background.mjs` (15 minutos de margen, autenticada con `NOVEDADES_SECRET`). Esa función manda de a 100 con la API de batch de Resend (`netlify/lib/novedades-core.mjs`), con un mail por persona y su link de baja propio. Antes de cada lote vuelve a leer el perfil: quien se dio de baja después de armar el envío **no** recibe el mail. Un candado y la `Idempotency-Key` evitan duplicados. Un envío a la vez.

**Límite diario de Resend.** El contador `mailsDiarios/{aaaa-mm-dd}` (día UTC) lo suman las novedades y también los mails de venta. Las novedades usan solo `límite − reserva − enviados hoy`. Lo que no entra queda «En cola» y sigue solo al día siguiente con la función programada `novedades-diario.mjs` (12:00 UTC, 9:00 en Argentina), o a mano con «Continuar el envío» en el panel.

**Cómo se probó.** `npm run test:novedades -- tucasilla+novedades@gmail.com` (20 comprobaciones, manda 1 mail real y limpia lo que crea): el token de la función y el de la web coinciden y no se pueden adulterar; un `<script>` o un link `javascript:` no llegan al mail; sin cupo no se manda y queda en cola; con cupo se manda al suscripto y se omite a quien se dio de baja; el contador sube 1; correr de nuevo no reenvía. Ese test encontró un bug real (la ejecución se bloqueaba a sí misma después del primer lote), ya corregido. `npm run mails:reintentar` lista (y con `--confirmar` reintenta) los mails de venta pendientes de las ventas de prueba.

**Límites conocidos:**
- **Netlify solo ejecuta las funciones programadas en el deploy de producción publicado.** En el deploy de la rama `backend` el envío diario automático **no corre**: mientras tanto hay que usar «Continuar el envío». Al publicar en producción hay que cargar también estas variables en el contexto Production.
- El día del cupo se cuenta en UTC (es lo que se asume que usa Resend). Solo cuenta lo que mandamos nosotros: si se usa la misma cuenta de Resend para otra cosa, esos mails no entran en el contador.
- El test cubre un lote; el envío de varios lotes seguidos (más de 100 suscriptos) no se probó con mails reales.
- Las funciones de fondo y programadas de Netlify no se pueden probar con `next dev`; se prueban en el deploy.

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

Cargar la clave secreta del webhook, redeployar y hacer la primera compra de prueba real con la cuenta de vendedor de prueba. Después: probar el panel con cada rol (ver «Panel de administración») y el visor 3D con botón «Ver en 3D» (`modelo3d` ya está en `perro-globo` y el panel lo guarda; falta pasarlo a la ficha). No se mergea a `main` hasta cerrar la prueba de pagos.

## Otras deudas conocidas

- Next 14 tiene vulnerabilidades reportadas por `npm audit` (preexistentes); conviene actualizar.
- Contraste bajo en algunos textos de tienda, fichas y contacto (`.shop-count`, `.breadcrumbs`, `.detail-note`, `.contact-card span`).
- El servidor de desarrollo (`next dev`) se queda sin memoria en esta máquina al compilar la home; para pruebas se usa `next build` + `next start`.
