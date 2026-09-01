-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arreglo 2: la función de arranque quedaba bloqueada por su
-- propio trigger, y la confirmación de email está activa (por eso la cuenta
-- de prueba no podía loguearse). Pegar y ejecutar en el SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Borra la cuenta admin de prueba que quedó sin confirmar, para recrearla
-- limpia después de este arreglo.
delete from auth.users where email = 'admin@tecnoshop.com';

-- El trigger ahora reconoce explícitamente cuándo se está ejecutando desde
-- bootstrap_first_admin (en vez de intentar adivinarlo a partir de si hay
-- sesión de usuario, que con las claves nuevas de Supabase no se comporta
-- como antes).
create or replace function public.prevent_self_promote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if current_setting('tecnoshop.bootstrap', true) = 'true' then
      null; -- permitido: lo está ejecutando bootstrap_first_admin
    elsif auth.uid() is not null and not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin
    ) then
      raise exception 'No autorizado para cambiar is_admin';
    end if;
  end if;
  return new;
end;
$$;

-- Ahora también confirma el email de la cuenta que promueve, para que la
-- primera cuenta admin pueda loguearse sin depender de recibir un correo real.
create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where is_admin) then
    raise exception 'Ya existe un administrador; usa el panel de administración para promover otras cuentas.';
  end if;

  perform set_config('tecnoshop.bootstrap', 'true', true);

  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = target_email);

  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
  where email = target_email;
end;
$$;
