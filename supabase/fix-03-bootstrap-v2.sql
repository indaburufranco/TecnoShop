-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arreglo 3: la señal que le pasaba al trigger para permitir el
-- arranque no persistía como esperaba. Ahora la función de arranque desactiva
-- el trigger un instante en vez de depender de esa señal. Pegar y ejecutar.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where is_admin) then
    raise exception 'Ya existe un administrador; usa el panel de administración para promover otras cuentas.';
  end if;

  alter table public.profiles disable trigger prevent_self_promote_trigger;

  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = target_email);

  alter table public.profiles enable trigger prevent_self_promote_trigger;

  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
  where email = target_email;
end;
$$;
