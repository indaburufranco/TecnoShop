-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — evita que el total de un pedido se pueda manipular desde el
-- cliente. Pegar y ejecutar en el SQL Editor. Seguro de volver a correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- HALLAZGO: "orders_insert_any" deja crear un pedido a cualquiera (necesario
-- para el checkout como invitado), pero el "total" lo manda el propio
-- cliente y se guarda tal cual, sin comparar contra el precio real de
-- "products". Alguien podía pedir productos caros pagando lo que quisiera
-- llamando directo a la API, sin pasar por la UI.
--
-- FIX: antes de insertar el pedido, recalcula el total sumando
-- cantidad × precio real de cada producto (buscado por nombre, que es como
-- ya vienen guardados los items). Si todos los productos del pedido se
-- reconocen, pisa el total con el valor correcto — así ningún pedido nuevo
-- puede tener un total inventado. Si algún item no matchea ningún producto
-- (por ejemplo un producto viejo ya borrado/renombrado), no toca nada y deja
-- pasar el total tal cual venía, para no romper pedidos legítimos.

create or replace function public.recompute_order_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  computed numeric(10, 2) := 0;
  item jsonb;
  matched_price numeric(10, 2);
  all_matched boolean := true;
begin
  for item in select * from jsonb_array_elements(new.items)
  loop
    select price into matched_price
    from public.products
    where name = (item ->> 'name')
    limit 1;

    if matched_price is null then
      all_matched := false;
      exit;
    end if;

    computed := computed + matched_price * coalesce((item ->> 'qty')::int, 1);
  end loop;

  if all_matched then
    new.total := computed;
  end if;

  return new;
end;
$$;

drop trigger if exists recompute_order_total on public.orders;
create trigger recompute_order_total
  before insert on public.orders
  for each row execute procedure public.recompute_order_total();
