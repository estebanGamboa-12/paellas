-- Tabla de clientes
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  notes text,
  status text not null default 'pendiente' check (status in ('pendiente', 'entregado', 'devuelto')),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Tabla de paellas vinculadas a clientes
create table if not exists public.paellas (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  servings integer not null check (servings >= 2),
  rice_type text,
  status text not null default 'pendiente' check (status in ('pendiente', 'cocinando', 'lista', 'entregada', 'devuelta')),
  scheduled_for timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Perfiles de usuario con roles (admin o empleado)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'empleado' check (role in ('admin', 'empleado')),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Política básica para que cada usuario pueda ver su perfil
alter table public.profiles enable row level security;

create policy "Profiles are readable by the authenticated user" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can update their profile" on public.profiles
  for update using (auth.uid() = id);

-- Políticas de clientes
alter table public.clients enable row level security;

create policy "Empleados pueden leer clientes" on public.clients
  for select using (auth.role() = 'authenticated');

create policy "Empleados pueden crear clientes" on public.clients
  for insert with check (auth.role() = 'authenticated');

create policy "Solo admins pueden actualizar o borrar clientes" on public.clients
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Solo admins pueden borrar clientes" on public.clients
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Políticas de paellas
alter table public.paellas enable row level security;

create policy "Empleados pueden leer paellas" on public.paellas
  for select using (auth.role() = 'authenticated');

create policy "Empleados pueden crear paellas" on public.paellas
  for insert with check (auth.role() = 'authenticated');

create policy "Empleados pueden actualizar paellas" on public.paellas
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Solo admins pueden borrar paellas" on public.paellas
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
