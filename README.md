## Conectar Supabase y Mercado Pago

Este proyecto funciona sin estas credenciales (usa un repositorio de
pedidos en memoria como stand-in — ver `src/lib/orders/dev-orders-store.ts`),
pero el login real y los pagos reales necesitan conectarlas:

1. **Supabase**: creá un proyecto en [supabase.com](https://supabase.com),
   corré la migración de `supabase/migrations/0001_orders.sql` (desde el
   SQL Editor del panel, o con la CLI de Supabase), y copiá `NEXT_PUBLIC_
   SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_
   ROLE_KEY` desde Settings > API a tu `.env.local` (copiá `.env.example`
   como base).
2. **Mercado Pago**: creá una app en [Mercado Pago Developers]
   (https://www.mercadopago.com.ar/developers), copiá el `MERCADOPAGO_
   ACCESS_TOKEN`, elegí un `MERCADOPAGO_WEBHOOK_SECRET` propio (cualquier
   string largo y random), y configurá la URL del webhook en el panel de
   Mercado Pago como `https://tu-dominio.com/api/mercadopago/webhook?secret=<el mismo secreto>`.
3. **Sitio**: seteá `NEXT_PUBLIC_SITE_URL` a tu dominio real en producción.

Ver `.env.example` para la lista completa de variables.
