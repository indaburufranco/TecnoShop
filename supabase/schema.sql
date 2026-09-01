-- ═══════════════════════════════════════════════════════════════════════════
-- TecnoShop — esquema de Supabase
-- Pegar y ejecutar UNA sola vez en: Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tablas ───────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  is_admin boolean not null default false,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2),
  category text not null,
  brand text,
  badge text,
  description text,
  rating numeric(2, 1) not null default 5,
  reviews integer not null default 0,
  images text[] not null default '{}',
  specs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users (id),
  email text not null,
  name text,
  address text,
  city text,
  items jsonb not null,
  total numeric(10, 2) not null,
  status text not null default 'Confirmado',
  created_at timestamptz not null default now()
);

-- ── Perfil automático al registrarse ─────────────────────────────────────────
-- Crea la fila en profiles apenas se crea una cuenta en auth.users (sea por
-- el formulario de registro de la app o por un insert manual como el de más
-- abajo). Corre con permisos elevados para poder escribir antes de que exista
-- sesión del usuario nuevo.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), false);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Seguridad (RLS) ──────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- La política de arriba permite editar el propio perfil, pero no distingue
-- qué columnas se cambian. Sin este trigger, cualquier cliente logueado
-- podría hacerse admin a sí mismo llamando directamente a la API. Se bloquea
-- salvo que quien lo haga ya sea admin, o se ejecute sin sesión de usuario
-- (SQL Editor / la función de arranque de más abajo).
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

-- Promueve la primera cuenta admin sin necesitar el SQL Editor: solo
-- funciona si todavía no existe ningún admin, y se autodeshabilita para
-- siempre después de usarse una vez. También confirma el email de esa
-- cuenta, para no depender de que llegue un correo real de confirmación.
-- Desactiva el trigger de arriba un instante (en vez de depender de una
-- señal de sesión, que con las claves nuevas de Supabase no persistía de
-- forma confiable entre la función y el trigger).
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

revoke all on function public.bootstrap_first_admin(text) from public;
grant execute on function public.bootstrap_first_admin(text) to anon, authenticated;

-- Cualquiera (incluso sin cuenta) puede ver el catálogo.
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

-- Solo cuentas con is_admin = true pueden crear/editar/borrar productos.
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

-- Cualquiera puede crear un pedido (incluye compra como invitado, sin sesión).
drop policy if exists orders_insert_any on public.orders;
create policy orders_insert_any on public.orders
  for insert with check (true);

-- Ves tus propios pedidos (por cuenta o por el email que usaste en el
-- checkout), y el admin ve todos.
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin on public.orders
  for select using (
    auth.uid() = user_id
    or email = (auth.jwt() ->> 'email')
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

-- Solo el admin puede cambiar el estado de un pedido.
drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

-- Recalcula el total de cada pedido a partir del precio real de los
-- productos (no del que mande el cliente), para que no se pueda inventar un
-- total más bajo llamando directo a la API. Si algún item no matchea ningún
-- producto (por ejemplo uno viejo ya borrado/renombrado), deja el total tal
-- cual vino, para no romper pedidos legítimos.
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

-- ── Permisos base ────────────────────────────────────────────────────────────
-- Las políticas de arriba (RLS) deciden QUÉ filas puede tocar cada rol, pero
-- Postgres además exige el permiso de base sobre la tabla en sí — sin esto,
-- la operación se bloquea antes de llegar a evaluar las políticas.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.profiles to anon, authenticated;

-- ── Storage: imágenes de productos ───────────────────────────────────────────

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

-- ── Cuenta de administrador ───────────────────────────────────────────────────
-- No se crea por SQL: insertar directamente en auth.users no genera la fila
-- que Supabase necesita en auth.identities y el login termina fallando con
-- "Database error querying schema". La forma correcta es registrarse desde
-- la propia app (o vía la API de auth) y después promoverla con
-- select public.bootstrap_first_admin('admin@tecnoshop.com'); — la función
-- definida más arriba, que solo funciona una vez mientras no exista ya un
-- admin.

-- ── Catálogo inicial (los 12 productos de la tienda) ─────────────────────────

insert into public.products (name, price, original_price, category, brand, badge, description, rating, reviews, images, specs)
values
  ('MacBook Pro 14" M3', 1899.99, 2199.99, 'Laptops & PCs', 'Apple', 'Oferta',
   'El MacBook Pro de 14 pulgadas con chip M3 lleva el rendimiento a otro nivel. Pantalla Liquid Retina XDR, batería de hasta 18 horas y conectividad completa con Thunderbolt 4. Ideal para profesionales creativos, desarrolladores y diseñadores que necesitan lo mejor.',
   4.9, 342,
   array[
     'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Apple M3 (8 núcleos CPU, 10 GPU)"},{"label":"Memoria RAM","value":"16 GB unificada"},{"label":"Almacenamiento","value":"512 GB SSD NVMe"},{"label":"Pantalla","value":"14.2\" Liquid Retina XDR, 3024×1964, 120Hz"},{"label":"Batería","value":"Hasta 18 horas"},{"label":"Sistema","value":"macOS Sonoma"},{"label":"Peso","value":"1.55 kg"}]'::jsonb),

  ('Samsung Galaxy S24 Ultra', 1149.00, null, 'Smartphones', 'Samsung', 'Nuevo',
   'El smartphone más poderoso de Samsung. Con cámara de 200MP, S Pen integrado, procesador Snapdragon 8 Gen 3 y pantalla Dynamic AMOLED de 6.8". La experiencia definitiva en Android para quienes no aceptan compromisos.',
   4.8, 218,
   array[
     'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Snapdragon 8 Gen 3"},{"label":"RAM","value":"12 GB"},{"label":"Almacenamiento","value":"256 GB"},{"label":"Pantalla","value":"6.8\" Dynamic AMOLED, 3088×1440, 120Hz"},{"label":"Cámara principal","value":"200 MP, f/1.7, OIS"},{"label":"Batería","value":"5000 mAh, carga 45W"},{"label":"Sistema","value":"Android 14 / One UI 6.1"}]'::jsonb),

  ('Sony WH-1000XM5', 279.99, 349.99, 'Audio', 'Sony', 'Bestseller',
   'Cancelación de ruido líder de la industria. Los WH-1000XM5 de Sony combinan ocho micrófonos, dos procesadores y el motor QN2e para eliminar el ruido exterior de forma excepcional. Sonido Hi-Res Audio con LDAC y autonomía de 30 horas.',
   4.7, 891,
   array[
     'https://images.unsplash.com/photo-1655156875398-d11323b4f5de?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Cancelación de ruido","value":"Adaptativa con 8 micrófonos"},{"label":"Autonomía","value":"30 horas (ANC activado)"},{"label":"Carga rápida","value":"3 min = 3 horas de uso"},{"label":"Conectividad","value":"Bluetooth 5.2, NFC, Jack 3.5mm"},{"label":"Códecs","value":"LDAC, AAC, SBC"},{"label":"Peso","value":"250 g"}]'::jsonb),

  ('ASUS ROG Zephyrus G16', 2249.00, null, 'Gaming', 'ASUS', null,
   'La laptop gaming definitiva para competir sin concesiones. El ASUS ROG Zephyrus G16 integra RTX 4080, panel ROG Nebula Display QHD 240Hz y refrigeración líquida avanzada en un chasis de apenas 1.85 kg. Domina cualquier juego.',
   4.6, 127,
   array[
     'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Intel Core i9-14900HX"},{"label":"GPU","value":"NVIDIA RTX 4080 12GB GDDR6"},{"label":"RAM","value":"32 GB DDR5 4800MHz"},{"label":"Almacenamiento","value":"1 TB SSD PCIe 4.0"},{"label":"Pantalla","value":"16\" QHD+ 240Hz, ROG Nebula Display"},{"label":"Sistema","value":"Windows 11 Pro"},{"label":"Peso","value":"1.85 kg"}]'::jsonb),

  ('Dell XPS 15 OLED', 1749.99, 1999.00, 'Laptops & PCs', 'Dell', 'Oferta',
   'La elegancia hecha laptop. El Dell XPS 15 OLED ofrece una pantalla impresionante de 15.6" con colores perfectos y contraste infinito, junto con el rendimiento de Core i7 de 13ª gen. Diseñado para creadores que valoran tanto la estética como el poder.',
   4.5, 203,
   array[
     'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Intel Core i7-13700H"},{"label":"GPU","value":"NVIDIA RTX 4060 8GB"},{"label":"RAM","value":"16 GB DDR5"},{"label":"Almacenamiento","value":"512 GB SSD NVMe"},{"label":"Pantalla","value":"15.6\" OLED 3.5K, 60Hz, 100% DCI-P3"},{"label":"Batería","value":"Hasta 13 horas"},{"label":"Peso","value":"1.86 kg"}]'::jsonb),

  ('iPad Pro 13" M4', 1099.00, null, 'Smartphones', 'Apple', 'Nuevo',
   'El iPad Pro M4 redefine lo que puede hacer una tablet. Con la pantalla Ultra Retina XDR más delgada del mundo, chip M4 de nivel computadora y compatibilidad con Apple Pencil Pro, es la herramienta definitiva para creativos y profesionales.',
   4.9, 456,
   array[
     'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Apple M4 (10 núcleos CPU)"},{"label":"Pantalla","value":"13\" Ultra Retina XDR OLED, 2752×2064"},{"label":"Almacenamiento","value":"256 GB"},{"label":"Cámara","value":"12 MP gran angular + TrueDepth frontal 12 MP"},{"label":"Conectividad","value":"Wi-Fi 6E, Bluetooth 5.3, USB-C"},{"label":"Batería","value":"Hasta 10 horas"}]'::jsonb),

  ('LG OLED C4 55"', 1299.00, 1599.00, 'Televisores', 'LG', 'Oferta',
   'Negro perfecto, colores infinitos. El LG OLED C4 incorpora el procesador α9 Gen7 con IA, compatible con Dolby Vision, HDR10 y Dolby Atmos. Ideal para cinéfilos y gamers que quieren la mejor experiencia visual en casa.',
   4.8, 312,
   array[
     'https://images.unsplash.com/photo-1783700776216-cf661c778151?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Panel","value":"OLED evo 4K, 120Hz"},{"label":"Procesador","value":"α9 Gen7 AI"},{"label":"HDR","value":"Dolby Vision, HDR10, HLG"},{"label":"Gaming","value":"HDMI 2.1, G-Sync, FreeSync, 0.1ms"},{"label":"Smart TV","value":"webOS 24"},{"label":"Audio","value":"60W, Dolby Atmos, AI Sound Pro"}]'::jsonb),

  ('Sony A7 IV Mirrorless', 2499.00, null, 'Cámaras', 'Sony', null,
   'La cámara híbrida de referencia para fotógrafos y videomakers profesionales. Sensor BSI CMOS de 33MP, ráfaga de 10fps, video 4K 60fps y sistema de enfoque con IA. El equilibrio perfecto entre rendimiento y versatilidad.',
   4.7, 89,
   array[
     'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Sensor","value":"BSI CMOS Full-Frame 33 MP"},{"label":"ISO","value":"100-51.200 (ampliable a 204.800)"},{"label":"Video","value":"4K 60fps, 10 bits, S-Log3"},{"label":"Ráfaga","value":"10 fps mecánica, 15 fps electrónica"},{"label":"Enfoque","value":"Fase/Contraste 759 puntos, AI"},{"label":"Batería","value":"NP-FZ100, aprox. 520 disparos"}]'::jsonb),

  ('Logitech MX Master 3S', 99.99, 119.99, 'Accesorios', 'Logitech', 'Popular',
   'El mouse más avanzado para trabajar con precisión. Sensor MagSpeed electromagnético ultrasilencioso, rueda de desplazamiento adaptativa, hasta 3 dispositivos simultáneos y batería de hasta 70 días. Diseñado para el trabajo intensivo.',
   4.8, 1204,
   array[
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1655156875398-d11323b4f5de?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Sensor","value":"MagSpeed óptico 8000 DPI"},{"label":"Botones","value":"7 botones programables"},{"label":"Conexión","value":"Bluetooth, Logi Bolt USB"},{"label":"Dispositivos","value":"Hasta 3 simultáneos (Easy-Switch)"},{"label":"Batería","value":"Hasta 70 días, carga USB-C"},{"label":"Compatibilidad","value":"Windows, macOS, Linux, iPadOS"}]'::jsonb),

  ('Apple HomePod mini', 99.00, null, 'Smart Home', 'Apple', null,
   'Gran sonido en tamaño compacto. El HomePod mini llena cualquier habitación con audio de 360° de alta calidad. Con Siri integrado, domótica HomeKit y la capacidad de crear un sistema estéreo con dos unidades. Simplemente enchufa y disfruta.',
   4.4, 567,
   array[
     'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Chip","value":"Apple S5"},{"label":"Audio","value":"360° con guía acústica, full range + pasivos"},{"label":"Conectividad","value":"Wi-Fi 802.11n, Bluetooth 5.0, Thread"},{"label":"Asistente","value":"Siri"},{"label":"Alimentación","value":"Cable USB-C (incluido)"},{"label":"Dimensiones","value":"84.3 mm alto × 97.9 mm diámetro"}]'::jsonb),

  ('Razer BlackWidow V4', 159.99, 189.99, 'Gaming', 'Razer', 'Oferta',
   'El teclado mecánico de los campeones. Switches Razer Yellow de actuación lineal ultrarrápida, iluminación Chroma RGB por tecla y construido para aguantar 80 millones de pulsaciones. Control multimedia dedicado y reposamuñecas magnético incluido.',
   4.6, 445,
   array[
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Switches","value":"Razer Yellow (lineal, 1.2mm actuación)"},{"label":"Durabilidad","value":"80 millones de pulsaciones"},{"label":"Iluminación","value":"Chroma RGB por tecla"},{"label":"Conexión","value":"USB-A trenzado desmontable"},{"label":"Extras","value":"Rueda multimedia, reposamuñecas magnético"},{"label":"Peso","value":"1.27 kg"}]'::jsonb),

  ('Google Pixel 8 Pro', 899.00, null, 'Smartphones', 'Google', null,
   'El smartphone de Google más inteligente hasta la fecha. Chip Tensor G3 diseñado por Google para IA en dispositivo, cámara de 50MP con Zoom Telescópico 5x y 7 años garantizados de actualizaciones. La mejor experiencia Android pura.',
   4.5, 178,
   array[
     'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format'
   ],
   '[{"label":"Procesador","value":"Google Tensor G3"},{"label":"RAM","value":"12 GB"},{"label":"Almacenamiento","value":"128 GB"},{"label":"Pantalla","value":"6.7\" LTPO OLED, 2992×1344, 1-120Hz"},{"label":"Cámara","value":"50MP + 48MP ultrawide + 48MP telescópico 5x"},{"label":"Batería","value":"5050 mAh, carga 30W"},{"label":"Actualizaciones","value":"7 años OS + seguridad"}]'::jsonb)
on conflict do nothing;
