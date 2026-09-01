-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — endurecimiento de RLS: bloquea auto-ascenso a admin
-- Pegar y ejecutar en el SQL Editor. Seguro de volver a correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- HALLAZGO: la policy "profiles_update_own" deja actualizar la propia fila de
-- profiles, pero RLS es por FILA, no por columna: cualquier usuario logueado
-- podía hacer, desde la consola del navegador,
--   supabase.from('profiles').update({ is_admin: true }).eq('id', miId)
-- y convertirse en administrador él mismo. Este trigger bloquea ese cambio a
-- menos que quien lo pida ya sea admin.

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
      raise exception 'No autorizado para cambiar is_admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_privilege_escalation on public.profiles;
create trigger prevent_privilege_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_privilege_escalation();
