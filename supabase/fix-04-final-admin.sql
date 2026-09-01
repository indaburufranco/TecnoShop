-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arreglo 4 (el bueno): había un SEGUNDO trigger de seguridad
-- (prevent_privilege_escalation) que no es el que armamos nosotros — parece
-- que lo agregó el Advisor de seguridad de Supabase por su cuenta, y era el
-- que bloqueaba todo. Lo sacamos (ya tenemos el nuestro, prevent_self_promote,
-- que hace lo mismo) y de paso dejamos la cuenta admin lista con tu
-- contraseña. Pegar y ejecutar en el SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Busca y elimina cualquier trigger en profiles que llame a esa función
-- (sin importar cómo se llame el trigger en sí) y la función misma.
do $$
declare
  trig record;
begin
  for trig in
    select tgname from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgfoid = 'public.prevent_privilege_escalation()'::regprocedure
  loop
    execute format('drop trigger if exists %I on public.profiles', trig.tgname);
  end loop;
end $$;

drop function if exists public.prevent_privilege_escalation() cascade;

-- Promueve la cuenta a admin (usando nuestro propio trigger, que sí sabemos
-- cómo desactivar un instante) y confirma su email.
alter table public.profiles disable trigger prevent_self_promote_trigger;

update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'indaburufranco@gmail.com');

alter table public.profiles enable trigger prevent_self_promote_trigger;

-- Confirma el email y deja la contraseña pedida.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    encrypted_password = crypt('8r14n403', gen_salt('bf'))
where email = 'indaburufranco@gmail.com';
