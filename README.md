# Paellas Express

Aplicación de gestión de pedidos de paellas construida con Next.js 14 y Supabase. Permite que un equipo de cocina registre clientes, cree pedidos de paellas y gestione estados desde un panel responsive con autenticación y control de roles (administradores y empleados).

## Características

- Autenticación con Supabase Auth y gestión de sesiones en Next.js App Router.
- Panel con buscador por nombre o teléfono y listado de clientes con estado (pendiente, entregado, devuelto).
- Formulario de alta rápida de clientes con creación simultánea de paella (mínimo 2 raciones).
- Control de estados de cada paella (pendiente, cocinando, lista, entregada, devuelta) con badges visuales.
- Acciones de panel: editar estado, marcar ticket, marcar devuelta y eliminar cliente.
- Gestión de empleados: los administradores pueden invitar nuevos usuarios con rol empleado.
- Esquema SQL listo para importar en Supabase con políticas RLS básicas.

## Requisitos previos

1. Crear un proyecto en [Supabase](https://supabase.com/) y obtener las claves:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Ejecutar el SQL de `supabase/schema.sql` en el editor SQL de Supabase para generar tablas y políticas.
3. Crear manualmente un usuario administrador (desde Auth > Users) y en la tabla `profiles` asignarle el rol `admin`.

## Configuración

1. Copia `.env.example` a `.env.local` y completa las variables.

   ```bash
   cp .env.example .env.local
   ```

2. Instala las dependencias.

   ```bash
   npm install
   ```

3. Ejecuta el servidor de desarrollo.

   ```bash
   npm run dev
   ```

4. Accede a `http://localhost:3000` y autentícate con tu usuario de Supabase.

## Estructura principal

- `app/` – Rutas App Router. Incluye el login (`page.tsx`) y el panel protegido (`dashboard/page.tsx`).
- `app/components/` – Componentes compartidos como el `Dashboard`, `LoginForm` y proveedor de autenticación.
- `app/api/admin/invite-employee/` – Endpoint API para que los administradores creen empleados.
- `lib/supabaseClient.ts` – Inicialización tipada de Supabase para cliente y servidor.
- `supabase/schema.sql` – Script SQL con tablas (`clients`, `paellas`, `profiles`) y políticas RLS.

## Notas de seguridad

- El endpoint `/api/admin/invite-employee` necesita la clave de servicio (`SUPABASE_SERVICE_ROLE_KEY`). Asegúrate de exponerla solo en el servidor.
- Revisa y adapta las políticas RLS a las necesidades de tu negocio antes de usar en producción.

## Scripts disponibles

- `npm run dev` – Modo desarrollo con recarga en caliente.
- `npm run build` – Compilación de la aplicación para producción.
- `npm run start` – Ejecuta la build en producción.
- `npm run lint` – Ejecuta ESLint con la configuración de Next.js.
