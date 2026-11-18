-- Turnos · Centro Quiropráctico SGO
-- Pegá este archivo completo en Supabase > SQL Editor y ejecutalo una sola vez.

create extension if not exists "pgcrypto";

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  whatsapp text not null,
  email text,
  ciudad text,
  edad integer check (edad is null or (edad >= 0 and edad <= 120)),
  sexo text,
  created_at timestamptz not null default now()
);

create table if not exists public.turnos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  fecha date not null,
  hora text not null check (hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'no_viene')),
  created_at timestamptz not null default now(),
  unique (fecha, hora)
);

create index if not exists turnos_fecha_idx on public.turnos (fecha);

create table if not exists public.configuracion (
  id integer primary key default 1 check (id = 1),
  recordatorio_cuando text not null default 'dia_anterior' check (recordatorio_cuando in ('dia_anterior', 'mismo_dia')),
  recordatorio_hora text not null default '18:00' check (recordatorio_hora ~ '^[0-2][0-9]:[0-5][0-9]$')
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

-- Seguridad: solo usuarios con sesión iniciada pueden leer o escribir.
alter table public.pacientes enable row level security;
alter table public.turnos enable row level security;
alter table public.configuracion enable row level security;

drop policy if exists "pacientes_autenticados" on public.pacientes;
create policy "pacientes_autenticados" on public.pacientes
  for all to authenticated using (true) with check (true);

drop policy if exists "turnos_autenticados" on public.turnos;
create policy "turnos_autenticados" on public.turnos
  for all to authenticated using (true) with check (true);

drop policy if exists "configuracion_autenticados" on public.configuracion;
create policy "configuracion_autenticados" on public.configuracion
  for all to authenticated using (true) with check (true);
