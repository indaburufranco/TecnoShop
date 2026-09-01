-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — arreglo final: faltaban los permisos base (GRANT) sobre las
-- tablas para los roles anon/authenticated. Las políticas de seguridad (RLS)
-- ya estaban bien armadas, pero sin el GRANT correspondiente, Postgres
-- bloquea la operación antes de siquiera evaluar esas políticas. RLS sigue
-- siendo quien decide QUÉ filas se pueden tocar; esto solo habilita la
-- operación en general. Pegar y ejecutar en el SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.profiles to anon, authenticated;
