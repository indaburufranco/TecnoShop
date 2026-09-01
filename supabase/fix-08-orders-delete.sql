-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — permite al admin borrar pedidos (no existía ninguna política
-- de DELETE en "orders", así que ni el admin podía borrar uno). Pegar y
-- ejecutar en el SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
  for delete using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));
