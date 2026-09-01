-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arreglo: cuenta admin rota, bucket de imágenes, y refuerzo de
-- seguridad. Pegar y ejecutar en el SQL Editor. No toca los productos.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Borra la cuenta admin que quedó mal creada (sin fila en auth.identities,
--    por eso el login daba error 500). El perfil asociado se borra solo por
--    el "on delete cascade" de la tabla profiles.
delete from auth.users where email = 'admin@tecnoshop.com';

-- 2) Bucket de imágenes de productos + políticas (no habían quedado creadas).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects
  for all
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  )
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

-- 3) Refuerzo de seguridad: la política "profiles_update_own" (cada uno edita
--    su propio perfil) no distinguía qué columnas se cambian — sin este
--    trigger, cualquier cliente logueado podría hacerse admin a sí mismo
--    llamando directamente a la API. Este trigger bloquea ese cambio salvo
--    que quien lo haga ya sea admin (o se ejecute desde acá, el SQL Editor,
--    sin sesión de usuario — necesario para arrancar el primer admin).
create or replace function public.prevent_self_promote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if auth.uid() is not null and not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin
    ) then
      raise exception 'No autorizado para cambiar is_admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_promote_trigger on public.profiles;
create trigger prevent_self_promote_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_self_promote();

-- 4) Función de arranque: promueve la primera cuenta admin sin necesitar el
--    SQL Editor de nuevo. Solo funciona si todavía no existe ningún admin —
--    después de usarla una vez, se autodeshabilita para siempre.
create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where is_admin) then
    raise exception 'Ya existe un administrador; usa el panel de administración para promover otras cuentas.';
  end if;
  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = target_email);
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public;
grant execute on function public.bootstrap_first_admin(text) to anon, authenticated;

-- Después de correr esto, no hace falta volver al SQL Editor: el resto
-- (crear la cuenta admin@tecnoshop.com y promoverla) se hace solo.
