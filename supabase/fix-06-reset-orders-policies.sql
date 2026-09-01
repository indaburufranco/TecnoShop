-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — resetea TODAS las políticas de "orders" a un estado limpio y
-- conocido (por si quedó alguna política extra de otro momento bloqueando
-- el checkout de invitado). Pegar y ejecutar en el SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'orders'
  loop
    execute format('drop policy if exists %I on public.orders', pol.policyname);
  end loop;
end $$;

create policy orders_insert_any on public.orders
  for insert with check (true);

create policy orders_select_own_or_admin on public.orders
  for select using (
    auth.uid() = user_id
    or email = (auth.jwt() ->> 'email')
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

create policy orders_update_admin on public.orders
  for update using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));
