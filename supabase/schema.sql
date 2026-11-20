-- Turnos · Centro Quiropráctico SGO
-- Pegá este archivo completo en Supabase > SQL Editor y ejecutalo.
-- Se puede ejecutar más de una vez: si la base ya existe, solo agrega lo que falta y no borra datos.

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


-- =====================================================================
-- Versión 2: reserva pública por link y bloqueo manual de días/horarios
-- =====================================================================

-- Quién cargó el turno y si el paciente dijo que era su primera vez.
alter table public.turnos add column if not exists origen text not null default 'consultorio';
alter table public.turnos add column if not exists primera_vez boolean not null default false;
alter table public.turnos drop constraint if exists turnos_origen_check;
alter table public.turnos add constraint turnos_origen_check check (origen in ('consultorio', 'link'));

-- Días u horarios que el profesional cierra a mano. hora null = día completo.
create table if not exists public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora text check (hora is null or hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  created_at timestamptz not null default now()
);
create unique index if not exists bloqueos_unico on public.bloqueos (fecha, coalesce(hora, ''));

alter table public.bloqueos enable row level security;
drop policy if exists "bloqueos_autenticados" on public.bloqueos;
create policy "bloqueos_autenticados" on public.bloqueos
  for all to authenticated using (true) with check (true);

-- Fecha de hoy en el consultorio (el servidor de Supabase corre en UTC).
create or replace function public.hoy_local() returns date
language sql stable as $$
  select (now() at time zone 'America/Argentina/Cordoba')::date
$$;

-- =====================================================================
-- Versión 5: turnos de 15 o 30 minutos y recordatorios predeterminados
-- =====================================================================

-- Hace falta para impedir que dos turnos se superpongan.
create extension if not exists btree_gist;

-- "09:30" -> 570 (minutos desde la medianoche).
create or replace function public.minutos(p_hora text) returns integer
language sql immutable as $$
  select split_part(p_hora, ':', 1)::int * 60 + split_part(p_hora, ':', 2)::int
$$;

-- Duración de cada turno: 30 minutos la primera vez, 15 para pacientes habituales.
-- Los turnos y bloqueos que ya existían eran de 30 minutos y se conservan así (esto corre una sola vez).
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'turnos' and column_name = 'duracion') then
    alter table public.turnos add column duracion integer not null default 30;
    insert into public.bloqueos (fecha, hora)
    select b.fecha, to_char(make_interval(mins => public.minutos(b.hora) + 15), 'HH24:MI')
      from public.bloqueos b where b.hora is not null
    on conflict do nothing;
  end if;
end $$;
alter table public.turnos alter column duracion set default 15;
alter table public.turnos drop constraint if exists turnos_duracion_check;
alter table public.turnos add constraint turnos_duracion_check check (duracion in (15, 30));

-- Dos turnos vigentes no pueden pisarse. Los "no viene" quedan guardados pero no ocupan lugar.
drop index if exists public.turnos_horario_vigente;
alter table public.turnos drop constraint if exists turnos_fecha_hora_key;
alter table public.turnos drop constraint if exists turnos_sin_superposicion;
alter table public.turnos add constraint turnos_sin_superposicion exclude using gist (
  fecha with =,
  int4range(public.minutos(hora), public.minutos(hora) + duracion) with &&
) where (estado <> 'no_viene');

-- Recordatorios por WhatsApp.
--   aviso1: 'dia_anterior_12' (el día anterior al mediodía) o una cantidad de horas antes ('24').
--   aviso2: '3h_1h_primeros' (3 horas antes; 1 hora antes para los turnos de 8:00 a 9:45), horas antes ('2') o 'ninguno'.
-- (Las columnas recordatorio_* de versiones anteriores quedan sin uso.)
alter table public.configuracion add column if not exists aviso1 text not null default 'dia_anterior_12';
alter table public.configuracion add column if not exists aviso2 text not null default '3h_1h_primeros';
alter table public.configuracion drop constraint if exists configuracion_aviso1_check;
alter table public.configuracion add constraint configuracion_aviso1_check check (aviso1 ~ '^(dia_anterior_12|[0-9]{1,3})$');
alter table public.configuracion drop constraint if exists configuracion_aviso2_check;
alter table public.configuracion add constraint configuracion_aviso2_check check (aviso2 ~ '^(3h_1h_primeros|ninguno|[0-9]{1,3})$');
alter table public.configuracion add column if not exists recordatorio_horas_antes integer not null default 24;
alter table public.pacientes add column if not exists como_nos_conocio text;

-- Las funciones cambiaron de parámetros o de resultado: se borran las versiones anteriores.
drop function if exists public.horario_de_atencion(date, text);
drop function if exists public.horarios_no_disponibles(date, date);
drop function if exists public.reservar_turno(text, text, text, date, text, boolean, text, text, integer, text);

-- Horario de atención: lunes a viernes de 8 a 12 y de 16 a 20, jueves solo a la tarde.
-- Los turnos de 15 minutos empiezan cada 15; los de 30, en punto o y media.
-- IMPORTANTE: si cambiás ATENCION en src/config.ts, cambiá también esta función.
create or replace function public.horario_de_atencion(p_fecha date, p_hora text, p_duracion integer) returns boolean
language plpgsql immutable as $$
declare
  v_dia int;
  v_ini int;
  v_fin int;
begin
  if p_fecha is null or p_hora is null or p_hora !~ '^[0-2][0-9]:[0-5][0-9]$' or p_duracion not in (15, 30) then return false; end if;
  v_dia := extract(isodow from p_fecha);  -- 1 = lunes ... 7 = domingo
  v_ini := public.minutos(p_hora);
  v_fin := v_ini + p_duracion;
  if v_dia > 5 or v_ini % p_duracion <> 0 then return false; end if;
  if v_ini >= 16 * 60 and v_fin <= 20 * 60 then return true; end if;
  if v_ini >= 8 * 60 and v_fin <= 12 * 60 and v_dia <> 4 then return true; end if;
  return false;
end;
$$;

-- Lo único que puede leer la página pública: qué horarios NO están libres y cuántos minutos ocupan.
-- No devuelve datos de pacientes. hora null = día completo bloqueado.
create or replace function public.horarios_no_disponibles(desde date, hasta date)
returns table (fecha date, hora text, duracion integer)
language sql stable security definer set search_path = public as $$
  select t.fecha, t.hora, t.duracion from public.turnos t where t.fecha between desde and hasta and t.estado <> 'no_viene'
  union
  select b.fecha, b.hora, 15 from public.bloqueos b where b.fecha between desde and hasta
$$;

-- Reserva desde el link. Devuelve 'ok', 'ocupado', 'limite' o 'invalido'.
-- Reconoce al paciente por los últimos 10 dígitos del WhatsApp; si no existe, lo crea.
-- El turno dura 30 minutos si es la primera vez y 15 si ya es paciente.
create or replace function public.reservar_turno(
  p_nombre text, p_apellido text, p_whatsapp text, p_fecha date, p_hora text,
  p_primera_vez boolean default false, p_email text default null, p_ciudad text default null,
  p_edad integer default null, p_sexo text default null, p_como_nos_conocio text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_digitos text := right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 10);
  v_hoy date := public.hoy_local();
  v_ahora text := to_char(now() at time zone 'America/Argentina/Cordoba', 'HH24:MI');
  v_duracion int := case when coalesce(p_primera_vez, false) then 30 else 15 end;
  v_ini int;
  v_paciente uuid;
begin
  if length(trim(coalesce(p_nombre, ''))) < 2 or length(trim(coalesce(p_apellido, ''))) < 2 or length(v_digitos) < 8
     or length(p_nombre) > 80 or length(p_apellido) > 80 or length(p_whatsapp) > 30
     or length(coalesce(p_email, '')) > 120 or length(coalesce(p_ciudad, '')) > 80 or length(coalesce(p_sexo, '')) > 20
     or length(coalesce(p_como_nos_conocio, '')) > 40 then
    return 'invalido';
  end if;
  if p_fecha < v_hoy or p_fecha > v_hoy + 365 or not public.horario_de_atencion(p_fecha, p_hora, v_duracion)
     or (p_fecha = v_hoy and p_hora <= v_ahora) then
    return 'invalido';
  end if;
  v_ini := public.minutos(p_hora);
  if exists (select 1 from public.bloqueos b where b.fecha = p_fecha
              and (b.hora is null or (public.minutos(b.hora) >= v_ini and public.minutos(b.hora) < v_ini + v_duracion)))
     or exists (select 1 from public.turnos t where t.fecha = p_fecha and t.estado <> 'no_viene'
                 and public.minutos(t.hora) < v_ini + v_duracion and public.minutos(t.hora) + t.duracion > v_ini) then
    return 'ocupado';
  end if;

  select p.id into v_paciente from public.pacientes p
   where right(regexp_replace(p.whatsapp, '\D', '', 'g'), 10) = v_digitos
   order by p.created_at limit 1;

  if v_paciente is null then
    insert into public.pacientes (nombre, apellido, whatsapp, email, ciudad, edad, sexo, como_nos_conocio)
    values (trim(p_nombre), trim(p_apellido), trim(p_whatsapp), nullif(trim(coalesce(p_email, '')), ''),
            nullif(trim(coalesce(p_ciudad, '')), ''), case when p_edad between 0 and 120 then p_edad end,
            nullif(trim(coalesce(p_sexo, '')), ''), nullif(trim(coalesce(p_como_nos_conocio, '')), ''))
    returning id into v_paciente;
  elsif (select count(*) from public.turnos t where t.paciente_id = v_paciente and t.fecha >= v_hoy and t.estado <> 'no_viene') >= 2 then
    return 'limite';
  end if;

  begin
    insert into public.turnos (paciente_id, fecha, hora, duracion, estado, origen, primera_vez)
    values (v_paciente, p_fecha, p_hora, v_duracion, 'pendiente', 'link', coalesce(p_primera_vez, false));
  exception when unique_violation or exclusion_violation then
    return 'ocupado';
  end;
  return 'ok';
end;
$$;

-- La página pública (rol anon) solo puede usar estas dos funciones; las tablas siguen cerradas.
revoke all on function public.horarios_no_disponibles(date, date) from public;
revoke all on function public.reservar_turno(text, text, text, date, text, boolean, text, text, integer, text, text) from public;
grant execute on function public.horarios_no_disponibles(date, date) to anon, authenticated;
grant execute on function public.reservar_turno(text, text, text, date, text, boolean, text, text, integer, text, text) to anon, authenticated;

-- Avisa a la API de Supabase que hay tablas y funciones nuevas.
notify pgrst, 'reload schema';
