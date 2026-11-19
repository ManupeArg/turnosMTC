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

-- Horario de atención: lunes a viernes de 8 a 12 y de 16 a 20, jueves solo a la tarde, turnos cada 30 minutos.
-- IMPORTANTE: si cambiás ATENCION o DURACION_MIN en src/config.ts, cambiá también esta función.
create or replace function public.horario_de_atencion(p_fecha date, p_hora text) returns boolean
language plpgsql immutable as $$
declare
  v_dia int;
  v_h int;
  v_m int;
begin
  if p_fecha is null or p_hora is null or p_hora !~ '^[0-2][0-9]:[0-5][0-9]$' then return false; end if;
  v_dia := extract(isodow from p_fecha);  -- 1 = lunes ... 7 = domingo
  v_h := split_part(p_hora, ':', 1)::int;
  v_m := split_part(p_hora, ':', 2)::int;
  if v_dia > 5 or v_m not in (0, 30) then return false; end if;
  if v_h >= 16 and v_h < 20 then return true; end if;
  if v_h >= 8 and v_h < 12 and v_dia <> 4 then return true; end if;
  return false;
end;
$$;

-- Lo único que puede leer la página pública: qué horarios NO están libres. No devuelve datos de pacientes.
create or replace function public.horarios_no_disponibles(desde date, hasta date)
returns table (fecha date, hora text)
language sql stable security definer set search_path = public as $$
  select t.fecha, t.hora from public.turnos t where t.fecha between desde and hasta and t.estado <> 'no_viene'
  union
  select b.fecha, b.hora from public.bloqueos b where b.fecha between desde and hasta
$$;

-- Versión 3: el recordatorio se configura en horas antes del turno, y se guarda cómo nos conoció el paciente.
-- (Las columnas viejas recordatorio_cuando y recordatorio_hora quedan sin uso; no molestan.)
alter table public.configuracion add column if not exists recordatorio_horas_antes integer not null default 24;
alter table public.configuracion drop constraint if exists configuracion_horas_check;
alter table public.configuracion add constraint configuracion_horas_check check (recordatorio_horas_antes between 1 and 168);
alter table public.pacientes add column if not exists como_nos_conocio text;

-- Versión 4: segundo aviso, y los turnos "no viene" liberan su día y horario.
alter table public.configuracion add column if not exists recordatorio2_horas_antes integer default 2;
alter table public.configuracion drop constraint if exists configuracion_horas2_check;
alter table public.configuracion add constraint configuracion_horas2_check check (recordatorio2_horas_antes is null or recordatorio2_horas_antes between 1 and 168);

-- Antes no podía haber dos turnos en el mismo día y horario. Ahora sí, siempre que a lo sumo uno esté vigente:
-- los que avisaron que no vienen quedan guardados pero no ocupan el lugar.
alter table public.turnos drop constraint if exists turnos_fecha_hora_key;
create unique index if not exists turnos_horario_vigente on public.turnos (fecha, hora) where estado <> 'no_viene';

-- La función de reserva cambió de parámetros: se borra la versión anterior para que no queden dos.
drop function if exists public.reservar_turno(text, text, text, date, text, boolean, text, text, integer, text);

-- Reserva desde el link. Devuelve 'ok', 'ocupado', 'limite' o 'invalido'.
-- Reconoce al paciente por los últimos 10 dígitos del WhatsApp; si no existe, lo crea.
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
  v_paciente uuid;
begin
  if length(trim(coalesce(p_nombre, ''))) < 2 or length(trim(coalesce(p_apellido, ''))) < 2 or length(v_digitos) < 8
     or length(p_nombre) > 80 or length(p_apellido) > 80 or length(p_whatsapp) > 30
     or length(coalesce(p_email, '')) > 120 or length(coalesce(p_ciudad, '')) > 80 or length(coalesce(p_sexo, '')) > 20
     or length(coalesce(p_como_nos_conocio, '')) > 40 then
    return 'invalido';
  end if;
  if p_fecha < v_hoy or p_fecha > v_hoy + 365 or not public.horario_de_atencion(p_fecha, p_hora)
     or (p_fecha = v_hoy and p_hora <= v_ahora) then
    return 'invalido';
  end if;
  if exists (select 1 from public.bloqueos b where b.fecha = p_fecha and (b.hora is null or b.hora = p_hora))
     or exists (select 1 from public.turnos t where t.fecha = p_fecha and t.hora = p_hora and t.estado <> 'no_viene') then
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
    insert into public.turnos (paciente_id, fecha, hora, estado, origen, primera_vez)
    values (v_paciente, p_fecha, p_hora, 'pendiente', 'link', coalesce(p_primera_vez, false));
  exception when unique_violation then
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
