-- Tabla de pedidos — el shape debe coincidir exactamente con el mapeo de
-- columnas en src/lib/orders/supabase-orders-repository.ts. Si cambia el
-- tipo Order (src/types/order.ts), esta tabla y esos mapeos deben
-- actualizarse juntos.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  shipping_zone_id text not null,
  payment_method text not null check (payment_method in ('mercado_pago', 'transferencia', 'efectivo')),
  customer_email text not null,
  address text not null,
  total numeric not null check (total >= 0),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente', 'pagado', 'rechazado')),
  shipping_status text not null default 'a_confirmar' check (shipping_status in ('a_confirmar', 'enviado')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- El checkout (Server Actions) corre con el cliente cookie-scoped de la
-- sesión del usuario logueado (ver src/lib/supabase/server.ts +
-- src/lib/orders/get-orders-repository.ts, role: 'user') — esta política
-- permite que un usuario autenticado solo cree/lea SUS PROPIOS pedidos,
-- comparando por email (todavía no existe una columna customer_id ligada
-- a auth.users — ver nota en progreso.md sobre esto como hardening futuro).
create policy "Usuarios autenticados pueden crear su propio pedido"
  on public.orders
  for insert
  to authenticated
  with check (customer_email = auth.jwt() ->> 'email');

create policy "Usuarios autenticados pueden ver su propio pedido"
  on public.orders
  for select
  to authenticated
  using (customer_email = auth.jwt() ->> 'email');

-- El webhook de Mercado Pago (src/app/api/mercadopago/webhook/route.ts)
-- corre con el cliente service-role (src/lib/supabase/service-role.ts,
-- role: 'service') para poder actualizar CUALQUIER pedido por id, sin
-- sesión de usuario detrás. El rol service_role de Supabase tiene
-- BYPASSRLS por defecto, así que no necesita (ni debe tener) una policy
-- explícita aquí — si en algún momento deja de bypassear RLS, agregar:
-- create policy "Service role puede actualizar cualquier pedido"
--   on public.orders for update to service_role using (true);
