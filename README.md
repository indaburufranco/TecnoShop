# TecnoShop

Tienda online de tecnología: categorías de productos, búsqueda, cuentas de usuario con panel de admin, carrito de compras y carrusel de promociones. Construida con React 19, Vite y Tailwind CSS v4.

## Cuenta de administrador

No hay ninguna cuenta de admin predefinida ni contraseña fija — nunca subas
credenciales reales a este README, es un repositorio público. Para crear tu
propia cuenta de admin:

1. Registrate normalmente desde la app: botón "Iniciar sesión" (arriba a la
   derecha) → "Registrate" → completá "Crear cuenta" con tu email real y una
   contraseña fuerte.
2. En Supabase → SQL Editor, ejecutá una sola vez (reemplazando el email):

   ```sql
   select public.bootstrap_first_admin('tu-email@ejemplo.com');
   ```

   Esta función (definida en `schema.sql`) solo funciona mientras no exista
   ya ningún admin, y se autodeshabilita para siempre después de usarse una
   vez. La app no tiene un panel para promover otras cuentas más adelante:
   para eso, desde el SQL Editor:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'otra-cuenta@ejemplo.com');
   ```
3. Cerrá sesión y volvé a entrar: tu cuenta ya tiene acceso al panel de
   administración (gestión de pedidos y productos).

> Si en algún momento un email/contraseña reales terminan commiteados a este
> repo (aunque sea en un commit viejo), tratalos como comprometidos: cambiá
> la contraseña de esa cuenta desde Supabase Authentication → Users, no
> alcanza con borrar el archivo del último commit.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Despliegue

Publicado en [Vercel](https://vercel.com), conectado a este repositorio: cada push a `main` dispara un deploy automático.
