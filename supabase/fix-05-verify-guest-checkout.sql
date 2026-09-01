-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — reasegura que el checkout como invitado siga funcionando.
-- Pegar y ejecutar en el SQL Editor. Seguro de volver a correr.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists orders_insert_any on public.orders;
create policy orders_insert_any on public.orders
  for insert with check (true);
