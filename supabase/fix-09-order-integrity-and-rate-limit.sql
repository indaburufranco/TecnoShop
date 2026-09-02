-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arregla dos problemas de seguridad reales encontrados en una
-- revisión: (1) el trigger que recalculaba el total del pedido matcheaba
-- productos por NOMBRE exacto y, si un item no matchea, dejaba pasar el
-- total tal cual lo mandó el cliente — alcanzaba con un nombre mal escrito
-- para eludir el recálculo e inventar un total más bajo; ahora matchea por
-- `id` de producto y RECHAZA el pedido si algún item no matchea, en vez de
-- confiar en el cliente. (2) no había ningún límite a cuántos pedidos se
-- podían crear seguidos desde el mismo email (el checkout de invitado no
-- requiere sesión), así que se agrega un tope simple. De paso, se acotan
-- los permisos base (GRANT) al mínimo necesario por rol — hasta ahora
-- anon/authenticated tenían los mismos 4 permisos sobre las 3 tablas,
-- aunque RLS ya impedía usarlos de más; esto es una segunda capa, no
-- reemplaza a RLS.
--
-- Este archivo es seguro de correr sobre la base ya provisionada (no
-- reinserta el catálogo ni borra datos): reemplaza la función/trigger
-- existentes y ajusta permisos. Pegar y ejecutar una vez en el SQL Editor
-- de Supabase. `schema.sql` ya incluye esta misma versión para instalaciones
-- nuevas.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.recompute_order_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  computed numeric(10, 2) := 0;
  item jsonb;
  item_id bigint;
  item_qty int;
  matched_price numeric(10, 2);
  recent_count int;
begin
  if new.email is null or new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email inválido.';
  end if;
  new.email := lower(new.email);

  select count(*) into recent_count
  from public.orders
  where email = new.email and created_at > now() - interval '10 minutes';

  if recent_count >= 8 then
    raise exception 'Se detectaron demasiados pedidos seguidos con este email. Esperá unos minutos e intentá de nuevo.';
  end if;

  if new.items is null or jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'El pedido no tiene productos.';
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    begin
      item_id := (item ->> 'id')::bigint;
      item_qty := (item ->> 'qty')::int;
    exception when others then
      raise exception 'Uno o más productos de tu carrito ya no están disponibles. Actualizá la página e intentá de nuevo.';
    end;

    if item_id is null or item_qty is null or item_qty < 1 or item_qty > 999 then
      raise exception 'Uno o más productos de tu carrito ya no están disponibles. Actualizá la página e intentá de nuevo.';
    end if;

    select price into matched_price
    from public.products
    where id = item_id;

    if matched_price is null then
      raise exception 'Uno o más productos de tu carrito ya no están disponibles. Actualizá la página e intentá de nuevo.';
    end if;

    computed := computed + matched_price * item_qty;
  end loop;

  new.total := computed;
  return new;
end;
$$;

drop trigger if exists recompute_order_total on public.orders;
create trigger recompute_order_total
  before insert on public.orders
  for each row execute procedure public.recompute_order_total();

create index if not exists orders_email_created_at_idx on public.orders (email, created_at);

-- ── Permisos base: pasar de "los mismos 4 a los dos roles" al mínimo por rol ──

revoke insert, update, delete on public.products from anon;
revoke select, update, delete on public.orders from anon;
revoke insert, delete on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;

grant select on public.products to anon;
grant insert on public.orders to anon;

-- ── Corrige un mensaje de error que apuntaba a una función inexistente ──────
-- Si `bootstrap_first_admin` se llama de nuevo (ya con un admin existente),
-- el mensaje de error decía "usa el panel de administración para promover
-- otras cuentas" — esa función nunca existió en la UI. Se corrige para que
-- apunte al SQL Editor, que es la forma real de promover una cuenta extra.
create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where is_admin) then
    raise exception 'Ya existe un administrador. La app no tiene un panel para promover otras cuentas — hacelo desde el SQL Editor: update public.profiles set is_admin = true where id = (select id from auth.users where email = ''nueva-cuenta@ejemplo.com'');';
  end if;

  alter table public.profiles disable trigger prevent_self_promote_trigger;

  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = target_email);

  alter table public.profiles enable trigger prevent_self_promote_trigger;

  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
  where email = target_email;
end;
$$;
