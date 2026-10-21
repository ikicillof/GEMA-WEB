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

## Páginas legales y botón de arrepentimiento

**Son modelos.** Cada página lleva una «Nota interna» (caja violeta punteada) que **solo ve quien entró como admin o creador**: se arma en el navegador con la sesión y no sale en el HTML público. Dice que el texto es un modelo a revisar por un contador o abogado y lista los datos que faltan. Hay que revisarlos antes de publicar en producción.

| Página | Qué tiene |
|---|---|
| `/terminos` | Quién vende, cómo se compra, precios en pesos, pago (Mercado Pago y transferencia con descuento), productos hechos a pedido y su demora, envíos por Correo Argentino, cambios y devoluciones, botón de arrepentimiento y jurisdicción. |
| `/privacidad` | Datos que se guardan y para qué, con quién se comparten (Firebase, Mercado Pago, Correo Argentino, Resend, Cloudinary), mails de novedades y baja, y cómo pedir que se borren (Ley 25.326). |
| `/devoluciones` | Plazos y condiciones con marcadores; aclara que elegir un color de la paleta no vuelve «personalizado» a un producto (art. 1116 inc. c CCyC). |
| `/arrepentimiento` | Formulario público (pedido, nombre, email, motivo opcional). Sin cuenta. |

**Datos de la vendedora: un solo archivo, `lib/vendedora.ts`.** Lo que está entre corchetes (`[RAZÓN SOCIAL]`, `[CUIT]`, `[CONDICIÓN FISCAL]`, `[DOMICILIO]`, `[EMAIL DE CONTACTO]` y los plazos y condiciones de `CONDICIONES`) se ve resaltado en amarillo en las páginas y el footer hasta que se reemplace. La nota interna cuenta cuántos faltan. El QR de Data Fiscal (ARCA) ya está cargado en `DATA_FISCAL` (21/10): imagen oficial en `public/data-fiscal.jpg` y link oficial `http://qr.afip.gob.ar/?qr=…`; se ve en el footer de todas las páginas.

**Footer y checkout.** El footer (todas las páginas) tiene los links a las cuatro páginas, razón social, CUIT y domicilio, el espacio del QR y el «Botón de arrepentimiento» siempre visible (Res. 424/2020). El checkout dice «Al comprar aceptás los términos y condiciones» con el link, arriba de los botones de pago.

**Cómo funciona el arrepentimiento.**
- `POST /api/arrepentimiento` (público, `lib/server/arrepentimiento.ts`): límite de 5 por IP cada 10 minutos, validación estricta, campo trampa para bots (si viene completo responde bien pero no guarda ni manda nada) y no revela si el pedido existe.
- Guarda `arrepentimientos/{ARR-aaaammdd-XXXXXX}` (solo servidor; las reglas de Firestore niegan todo lo demás) con `estado` (`recibido`, `en_gestion`, `resuelto`), si el pedido existe, si el email coincide con el del pedido y `modoPrueba` (si la venta es de prueba).
- Manda **dos mails distintos**, cada uno con su plantilla, su destinatario y su reply-to (`armarMail` en `lib/server/arrepentimiento.ts`). **Cliente** (`emails/arrepentimiento-cliente.tsx`, «Recibimos tu solicitud de arrepentimiento»): tono cálido firmado por Gemi, n.º de trámite bien visible, fecha y hora, pedido, qué pasa ahora (plazo de respuesta y de reintegro de `CONDICIONES`), link a `/devoluciones`, email de contacto y WhatsApp; reply-to = email de contacto de la tienda (`VENDEDORA.emailContacto`; mientras sea un marcador, `RESEND_REPLY_TO`). **Dueña** (`emails/arrepentimiento-duena.tsx`, «Nueva solicitud de arrepentimiento»): trámite, cliente, email, pedido, motivo, aviso si el pedido no existe o el email no coincide y botón a `/admin/arrepentimientos`; va a `configuracion/general.emailAvisos` y reply-to = email del cliente. Los tipos de datos son distintos (`emails/arrepentimiento-tipos.ts`): el mail del cliente no tiene ni un campo interno. Con venta de prueba los dos llevan `[PRUEBA]`; los dos salen también en texto plano. Mientras `plazoRespuestaArrepentimiento` o `plazoReintegro` sean marcadores, el cliente lee «a la brevedad» / «sin demoras» (en una solicitud de prueba se ve el marcador, para no olvidarlo). Cada mail tiene su estado en el documento: `mailCliente` y `mailDuena` = `{estado: pendiente|enviado|error, intentos, en, error}`; un fallo no pierde la solicitud (`mailsPendientes`). Pasadas 30 solicitudes en un día se siguen guardando pero no se mandan mails automáticos.
- Panel `/admin/arrepentimientos`: lista con buscador y filtro de estado, avisos de pedido o email que no coinciden, estado de cada mail por separado con «Reintentar este mail» (cliente o dueña, cada uno con su plantilla y destinatario) y cambio de estado. Ver: colaborador con `ventas:ver`. Cambiar estado y reintentar: admin o creador (queda en `auditoria`). Las solicitudes viejas (con `emails.cliente`/`emails.duena`) se siguen mostrando.

**Cómo se probó (20/10, build + `next start`).** Datos inválidos → 400; campo desconocido → 400; campo trampa → 201 sin guardar; sin sesión las rutas del panel dan 401; la nota interna no está en el HTML público; el footer enlaza a `/arrepentimiento`; el límite por IP responde 429 a partir de la sexta llamada seguida. **No se hizo una solicitud real de punta a punta** (guardaría un documento en el Firestore compartido y mandaría 2 mails): probarla desde `/arrepentimiento` con un pedido de prueba y ver que aparezca en el panel.

**Límites conocidos:**
- Los plazos, la condición fiscal y el criterio de productos personalizados son marcadores: **el texto no está listo para publicar** hasta completarlos y que lo revise un profesional.
- Quien se arrepiente no necesita estar logueada, así que la identidad se valida a mano con los avisos «No encontramos ese pedido» / «El email no coincide».
- Todavía no hay reembolso automático: la gestión de la devolución y del reintegro es manual.

## Pendiente

0. **Completar lo que queda de `lib/vendedora.ts`**: URL de Instagram de la marca y los plazos y condiciones (transferencia, cambios, condiciones de cambio, reintegro, respuesta al arrepentimiento, reclamo por daños, criterio para productos personalizados). Los datos fiscales (razón social, CUIT, condición fiscal, domicilio) y el QR de Data Fiscal ya están cargados. Después: hacer revisar las páginas legales y probar una solicitud real en `/arrepentimiento`.

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

## Mails: revisión de plantillas cruzadas (21/10)

Se reportó que al cliente le llegaba el aviso de la dueña. Revisado: el código **no** cruzaba plantillas ni destinatarios (el envío y el reintento elegían la plantilla por destinatario); la causa más probable es que en la prueba el email del cliente era el mismo que `emailAvisos`, y los dos mails caen en una sola bandeja. Igual se rehízo para que no pueda pasar: tipos de datos separados, estado por mail y reintento por mail. Mails de venta: `armar()` en `lib/mail-core.ts` elige plantilla y destinatario por tipo (`nueva_venta_duena` → `emailAvisos`; `confirmacion_cliente` y `transferencia_completada` → email del cliente) y el reintento usa el tipo guardado en `orders/{id}.emails.<tipo>`; no hay cruce. **Para probar sin confundirse, usá un email de cliente distinto de `emailAvisos`.**

## Casilla de novedades del login

Se veía rara porque está fuera de `.auth-form` y no recibía el estilo de `.auth-form .auth-check` (fila, texto, tamaño). Ahora `.auth-check--novedades` tiene su propio estilo: caja con la casilla a la izquierda, texto de 13 px y borde violeta al tildar. No se pudo mirar en pantalla (el navegador de pruebas no estaba conectado): confirmar a ojo en el celular.

## SEO y rendimiento (21/10)

**Qué hay.** Todo se arma en `lib/seo.ts` (dominio canónico `gemma-oficial.com.ar`, `metaPagina()`, JSON-LD).
- **Metadatos:** `metadataBase` desde `SITE_URL`, título con plantilla «%s | Gemma», `<html lang="es-AR">`, Open Graph (`es_AR`, `website`, «Gemma») y Twitter `summary_large_image`. Título, descripción y canonical propios en home, tienda, quiénes somos, contacto, las 4 páginas legales y cada producto (nombre, descripción corta y foto principal; las fotos de Cloudinary se encuadran a 1200x630 con la propia URL de Cloudinary).
- **Imagen Open Graph general:** `public/og-gemma.png` (1200x630: logo, Gemi, «Hacemos que cada rincón brille», fondo oscuro del home). Es un PNG fijo (no se genera en el servidor: el generador de `next/og` falla en el build en Windows).
- **Datos estructurados:** `Organization` en el home (con `sameAs` solo cuando se complete Instagram); `Product` (precio en ARS, marca Gemma, disponibilidad `InStock`, **sin reseñas ni calificaciones**) y `BreadcrumbList` en cada producto.
- **`/sitemap.xml`** dinámico: páginas públicas + productos activos de Firestore con su fecha real de modificación. **`/robots.txt`**: bloquea `/admin`, `/checkout`, `/mis-compras`, `/mi-cuenta`, `/api`, `/auth` y `/baja` e indica el sitemap. Las páginas privadas llevan además `noindex` por metadata y por encabezado.
- **Un solo dominio:** `middleware.ts` redirige `www.gemma-oficial.com.ar` → `gemma-oficial.com.ar` (301; el dominio principal configurado en Netlify es el **sin www**) y en cualquier otro host (`*.netlify.app`, localhost) agrega `X-Robots-Tag: noindex, nofollow`, y `robots.txt` devuelve `Disallow: /`.

**Qué tenés que completar o confirmar**
1. **`SITE_URL` en el contexto Production de Netlify tiene que ser `https://gemma-oficial.com.ar`** (de ahí salen los canonical, el sitemap y las imágenes Open Graph). En la rama `backend` queda la URL de Netlify, que igual sale con `noindex`.
2. `VENDEDORA.instagram` en `lib/vendedora.ts` (marcador `[URL DE INSTAGRAM DE LA MARCA]`): mientras no se complete, el JSON-LD de Organization sale sin redes sociales.
3. **Descripción de cada producto** (campo «descripción» en el panel): es lo que ven Google y WhatsApp. Si está vacía se usa una frase genérica («…pieza de diseño impresa en 3D por Gemma, hecha a pedido en el color que elegís»). Las de hoy son textos cortos del catálogo inicial.
4. Confirmar la frase «Envíos a todo el país por Correo Argentino» de la descripción de `/tienda` y `availability: InStock` (se fabrica a pedido; schema.org no tiene «a pedido»).
5. `ULTIMA_ACTUALIZACION_PAGINAS` (`lib/seo.ts`): fecha de `lastmod` de las páginas fijas; actualizarla cuando se edite su texto.
6. Después de publicar: dar de alta el sitio en Google Search Console y enviar `https://gemma-oficial.com.ar/sitemap.xml`.

**Rendimiento (medido en build local).**
- **El motor 3D (three.js, ~680 KB) venía en el HTML inicial** aunque las escenas figuraban como «diferidas»: `home-journey` importaba una constante de `journey-scene` y `safe-invalidate` importaba R3F de forma estática. Ahora las constantes viven en `components/journey-timing.ts`, `safe-invalidate` importa R3F cuando ya hay una escena cargada, y las escenas se descargan con `cargaDiferida()` (`components/carga-diferida.tsx`) cuando el navegador está libre; la puerta del hero espera a `requestIdleCallback`. Todas van dentro de `EscenaSegura` (si el 3D falla, desaparece y el texto, el h1 y Gemi en SVG siguen).
- **JavaScript inicial (First Load JS): home 394 kB → 158 kB; Quiénes somos 355 kB → 144 kB.** Se comprobó en el navegador que la puerta, la impresora y el desfile se dibujan igual.
- **Imágenes:** se sacó `unoptimized` (config y componentes de producto): ahora Next/Netlify sirven WebP/AVIF a medida del dispositivo (una foto de producto de 515 KB pasó a 24 KB en la prueba local). Solo las 4 primeras tarjetas cargan con prioridad (antes eran todas) y la foto de hover es perezosa. **Verificar en el deploy** que `/_next/image?url=%2Fproductos%2Fpdfimg-004.png&w=640&q=75` responde 200 (el CDN de imágenes de Netlify no se pudo probar desde acá).
- Poppins ya usaba `next/font`. Jerarquía: un h1 por página (en el home es «Hacemos que cada rincón brille», en HTML del servidor), tarjetas de la tienda como h2, secciones del recorrido como h2.

**Cómo verificar**
- Metadatos: ver el código fuente de cada página (Ctrl+U) o pegar la URL en <https://www.opengraph.xyz>; en WhatsApp, pegar el link de un producto.
- Datos estructurados: Rich Results Test de Google con la URL de un producto.
- Sitemap y robots: abrir `/sitemap.xml` y `/robots.txt` en `gemma-oficial.com.ar` (con productos y con `Allow`) y en la URL de Netlify (con `Disallow: /`).
- Redirección: abrir `www.gemma-oficial.com.ar/tienda` y comprobar que cae en `gemma-oficial.com.ar/tienda`.
- noindex: `curl -I https://<sitio-netlify>/` muestra `x-robots-tag: noindex, nofollow`.
- Rendimiento: PageSpeed Insights en modo celular con la URL del home.

## Favicon, íconos y manifiesto (21/10)

El zip original queda en `materials/` (carpeta ignorada por git: `materials/` está en `.gitignore`; ojo, los 14 archivos que ya estaban commiteados en `materials/modelos/` siguen en el repo hasta que se los saque con `git rm --cached`).
- `app/favicon.ico` (16, 32, 48 y 64 px), `app/icon.png` (512x512, transparente) y `app/apple-icon.png` (180x180, fondo grafito): Next los enlaza solo en el `<head>`. No había ningún favicon anterior ni el de Next por defecto.
- `app/manifest.ts` → `/manifest.webmanifest`: nombre y nombre corto «Gemma», `es-AR`, `start_url: /`, `display: standalone`, `theme_color #FF4DA6`, `background_color #FFF9F5`. Íconos en `public/icons/`: 192, 512 y `icon-maskable-512.png` (el zip lo traía con fondo grafito y la G dentro de la zona segura, así que no se generó uno con fondo crema). `viewport.themeColor` = `#FF4DA6` en `app/layout.tsx`.
- Cómo verificar: pestaña del navegador con la G; en Chrome del celular, menú ⋮ → «Agregar a pantalla de inicio»; en DevTools → Application → Manifest.

## Mails: avisos viejos y entregabilidad (21/10)

- **Los 6 avisos a la dueña en error** (`Invariant: incrementalCache missing…`, bug ya corregido) son de pruebas: `3d0Xs17YEDvDsrbE0oWK`, `IrJ3l7gZxZIrW8l68Knl`, `eQtWimo8nO0qRJhzbxVp`, `fjFqbjboU9cSWQbhWvN0`, `hibLDwDlBwuusKE8zN65` y `kodCv6LiBdG5iRQZbTxn`, todos con `modoPrueba: true` (de hecho las 15 ventas actuales lo son). No se reintentaron: se borran con `npm run limpiar:pruebas -- --confirmar`. Ese script solo limpia `orders` y `carritos`; **las solicitudes de prueba de la colección `arrepentimientos` no se borran** (hoy hay 3 de prueba).
- **DNS de `gemma-oficial.com.ar`** (consultado con `Resolve-DnsName`; el DNS es el de Netlify): DKIM de Resend presente (`resend._domainkey`); SPF y MX de Resend presentes en el subdominio `send.` (así es como lo pide Resend); **DMARC presente pero mínimo: `v=DMARC1; p=none;` sin dirección de reportes**. El dominio raíz no tiene registro MX (no recibe correo) ni SPF propio.

## Data Fiscal (ARCA) en el footer (21/10)

El sello oficial «Data Fiscal» (con el QR de la inscripción) sale en el footer de **todas las páginas** (`components/site-footer.tsx`, montado en `app/layout.tsx`). Datos en `lib/vendedora.ts` → `DATA_FISCAL`: imagen `public/data-fiscal.jpg` (la oficial `DATAWEB.jpg` de ARCA, 239x327 px, copiada al sitio: el original por `http` no carga desde una página `https`) y link `http://qr.afip.gob.ar/?qr=…` (redirige solo a la página segura de ARCA que valida la inscripción; se abre en otra pestaña). El sello es vertical, por eso tiene su propio tamaño (112 px de ancho, `.footer-qr--real`) y en pantallas anchas se corre 84 px para que no lo tape el Gemi flotante. Para cambiarlo: editar `DATA_FISCAL` y reemplazar la imagen. Verificar: abrir cualquier página, bajar al pie y hacer clic en el sello (tiene que abrir la página de ARCA con tus datos); o escanear el QR con el celular.

**Datos fiscales cargados (21/10):** razón social BRELIS LEANDRO GUSTAVO, CUIT 20-35067988-0 (coincide con el CUIT del QR de ARCA), Responsable Monotributo, domicilio fiscal Esmeralda 2902, Florida (CP 1602), Provincia de Buenos Aires. Salen en el footer de todas las páginas y en Términos y Privacidad. Siguen con marcador amarillo los otros datos (lista en el punto 0 de «Pendiente»).

## Footer y textos legales: datos del vendedor (21/10)

- **Footer:** quedó solo el sello/QR de Data Fiscal (sin tocar) y los links legales (Términos, Privacidad, Cambios y devoluciones, Botón de arrepentimiento). Se sacaron del footer la razón social, el CUIT, la condición fiscal y el domicilio.
- **Datos del vendedor** (`lib/vendedora.ts`, único lugar): razón social BRELIS LEANDRO GUSTAVO, CUIT 20-35067988-0, Responsable Monotributo, domicilio fiscal Esmeralda 2902, Florida (CP 1602), Provincia de Buenos Aires. El email de contacto sigue como marcador.
- **`/terminos`:** la sección 1 pasó a ser «Datos del vendedor» (razón social, CUIT, condición fiscal, domicilio fiscal y email de contacto, todo leído de `lib/vendedora.ts`); el ancla cambió de `#vendedora` a `#vendedor`. **`/privacidad`:** el responsable de los datos figura con esos mismos datos. En `/devoluciones` y `/arrepentimiento` no hay datos del vendedor: allí se dice «Gemma».
- **Redacción neutra:** «la vendedora» se cambió por «Gemma» o «el vendedor» en todos los textos legales (Términos, Devoluciones y la nota interna).
- **Marcadores `[…]` que siguen** (todos en `lib/vendedora.ts`): `plazoTransferencia` (Términos), `plazoCambios`, `condicionesCambios` y `criterioPersonalizados` (Devoluciones), `plazoReintegro` (Devoluciones y mail de arrepentimiento), `plazoRespuestaArrepentimiento` (mail de arrepentimiento), `plazoReclamoDanos` (Términos y Devoluciones) e `instagram` (datos estructurados del SEO, no se ve en pantalla).

## Email de contacto y mails de cuenta por Resend (21/10)

**Email de contacto.** `VENDEDORA.emailContacto` = `somosgemma.ar@gmail.com` (Términos, Privacidad, Devoluciones y mail de arrepentimiento al cliente, cuyo reply-to es ese email). Los mails a clientes (venta, cancelación, verificación, contraseña) y la prueba de novedades responden a `emailDeRespuestas()` (`lib/mail-core.ts`): **`RESEND_REPLY_TO` si está cargada; si no, el email de contacto**. Ojo: hoy `RESEND_REPLY_TO` apunta a otro Gmail (`ikicillof…`); si querés que todas las respuestas vayan a `somosgemma.ar@gmail.com`, cambiá esa variable en Netlify (o borrala). El footer y «Contacto» siguen mostrando el Gmail y el Instagram personales (no se tocaron).

**Verificación de email y recuperar contraseña: ahora los manda nuestro backend por Resend** (diseño de Gemma, desde `RESEND_FROM_EMAIL`, reply-to como arriba, versión texto plano), no los mails genéricos de Firebase. Antes se usaban `sendEmailVerification` y `sendPasswordResetEmail` del SDK en `components/auth-provider.tsx` (registro, reenvío desde el login y «Olvidé mi contraseña»); ya no queda ninguna llamada. El login con Google no cambió.
- `POST /api/auth/enviar-verificacion` (con sesión): verifica el ID token (sirve el de una cuenta sin verificar) y manda el mail **solo al email de esa cuenta** (no lee el body); si ya está verificada no manda nada.
- `POST /api/auth/recuperar-contrasena` (pública, `{email}`): responde **siempre el mismo mensaje**, exista o no la cuenta; no manda nada si no existe, si es solo de Google o si está deshabilitada; un fallo de envío queda solo en el log.
- Los links los genera firebase-admin (`generateEmailVerificationLink` / `generatePasswordResetLink`), se les saca `mode` y `oobCode` y se rearma `{SITE_URL}/auth/accion?mode=…&oobCode=…` (`lib/server/auth-mails.ts`). **`SITE_URL` tiene que ser la URL real del sitio en cada contexto** (en la rama backend, la de Netlify; en producción, `https://gemma-oficial.com.ar`).
- **Límites** guardados en Firestore (`limitesAuth/{hash}`, solo hashes, ventana de 1 hora, transaccional): 3 por email y por tipo de mail, 10 por IP y por tipo; se cuentan siempre (exista o no la cuenta), así el «demasiados intentos» tampoco revela si un email está registrado. Más el límite por IP en memoria de siempre. `TOO_MANY_ATTEMPTS_TRY_LATER` de Firebase y el límite propio dan el mismo mensaje amable. Opcional: en Firestore → TTL, política sobre el campo `expira` de `limitesAuth` para que borre solos los contadores viejos.
- **`/auth/accion`** (`noindex`, también por encabezado): `verifyEmail` → `applyActionCode`, y con sesión abierta `reload()` + `getIdToken(true)` + `/api/auth/sync` para que se actualicen `emailVerified` y los claims; `resetPassword` → `verifyPasswordResetCode` (muestra el email), formulario con confirmación (mínimo 8 caracteres, como el registro, con ojito) y `confirmPasswordReset`. Errores claros (vencido, ya usado o inválido, deshabilitado) con botón para pedir uno nuevo; `CargaGemma` en las esperas.
- Si Resend falla al registrarse, la cuenta igual se crea y se avisa que no salió el mail (al ingresar se ofrece reenviarlo).

**El día de la publicación:** en Firebase Console → Authentication → Plantillas (Templates) poner como URL de acción `https://gemma-oficial.com.ar/auth/accion` (editar la plantilla → «Personalizar URL de acción»). Con el sistema actual los links los armamos nosotros y no dependen de esa URL, pero así cualquier mail que Firebase llegara a mandar también cae en nuestra página. Además, `gemma-oficial.com.ar` tiene que estar en Authentication → Settings → Authorized domains.

**Cómo se probó (local, build + `next start`, cuentas temporales `@example.com` ya borradas; no se mandó ningún mail real):** links generados con los modos correctos; `/auth/accion` confirmó el email (`emailVerified` pasó a true), mostró el error «Este enlace no sirve» al reusar el link, y cambió una contraseña (validó contraseñas distintas y cortas; la nueva funciona y la vieja no). Rutas: 401 sin token o con token inválido; cuenta ya verificada → `yaVerificado` aunque el body traiga otro email; `recuperar` con email mal escrito o con campos extra → 400; email sin cuenta → siempre el mismo 200 y el 4.º intento en la hora → 429. **No se probó el envío real por Resend de estos dos mails** (sí el armado y la versión texto): probarlo en el deploy.

## Registro Nacional de Bases de Datos en /privacidad (21/10)

`VENDEDORA.registroAAIP` (`lib/vendedora.ts`) quedó **vacío** y `/privacidad` solo muestra la línea «La base de datos se encuentra registrada ante la Agencia de Acceso a la Información Pública: …» cuando el campo tiene valor: vacío, no se muestra nada (ni línea, ni título, ni texto de reemplazo) y el resto de la página se lee completo. Ningún otro lugar usa ese campo (mails, footer y Términos no lo mencionan). Ya no figura entre los marcadores pendientes.

**Pendiente opcional:** si la base de datos se inscribe en el Registro Nacional de Bases de Datos Personales (AAIP, Ley 25.326), escribir el número en `registroAAIP` y la línea vuelve a aparecer sola.

Detalle a tener en cuenta: el texto de la «nota interna» de cada página legal (la caja punteada que solo ven admin y creador, que menciona esta inscripción) no se dibuja para el público, pero viaja dentro de los datos que Next manda al navegador junto con la página, así que se puede leer con «Ver código fuente». No es información sensible, pero el comentario de `components/legal.tsx` que dice que «ni siquiera sale en el HTML» no es del todo cierto.

## Contacto: Gmail, WhatsApp e Instagram de la marca; sello centrado (21/10)

- **Datos de contacto en un solo lugar, `lib/vendedora.ts`:** `emailContacto` = `somosgemma.ar@gmail.com`, `whatsapp` = `5491164360868` (se muestra «+54 9 11 6436-0868», `whatsappVisible`) e `instagram` (URL de la marca; el `@usuario` se saca de la URL con `instagramUsuario()`). De ahí leen el footer, «Contacto», el número por defecto de los mails y la página de transferencia (`WHATSAPP_NUMERO` en `lib/envio.ts` ahora sale de `VENDEDORA.whatsapp`). Ya no queda en el código el Gmail, el teléfono ni el Instagram personales.
- **WhatsApp en el panel:** el valor guardado en `configuracion/general.whatsapp` (panel → Configuración) tiene prioridad en los mails: seguía siendo el provisorio viejo y se actualizó a `5491164360868`. Los datos de transferencia (alias, titular, banco) siguen siendo de ejemplo. El email de avisos (`emailAvisos`, adonde llegan los avisos internos de ventas y arrepentimientos) **no se tocó**: sigue en `ikicillof@gmail.com`; se cambia en el panel → Configuración.
- **«Contacto»:** se sacó la tarjeta «Retiro» (Vicente López). Además se sacó el subtítulo «Envío por motomensajería o retiro en Vicente López» del mapa de entrega de `/tienda` (`components/delivery-map.tsx`): ya no hay motomensajería ni retiro. Quedaron el título «Te lo llevamos a la puerta de tu casa» y la animación del mapa con la moto.
- **Footer:** el sello de Data Fiscal quedó centrado en el pie (se quitó el corrimiento que lo esquivaba al Gemi flotante, que ya no se superpone).
- **Instagram:** la URL de `VENDEDORA.instagram` trae un parámetro de seguimiento (`?cplk=…`); conviene dejarla como `https://www.instagram.com/somosgemma.ar`.

**Pendiente para cuando termine la etapa de pruebas:** pasar los avisos internos al Gmail de la marca. Los avisos de venta nueva y de arrepentimiento siguen yendo a `ikicillof@gmail.com` a propósito (se está probando): al publicar, cambiar `emailAvisos` en el panel → Configuración a `somosgemma.ar@gmail.com`.
