// Capa de datos. Con Supabase configurado lee y escribe ahí;
// sin configurar, guarda todo en el navegador (modo demo) para poder probar la app al toque.
import type { Bloqueo, Config, Datos, DatosPaciente, NoDisponible, Paciente, Turno } from '../types';
import { PACIENTES_EJEMPLO, turnosEjemplo } from './ejemplos';
import { DIAS_RESERVA } from '../config';
import { ocupaLugar } from './disponibilidad';
import { hoyIso, slotsDe, sumarDias, yaPaso } from './fechas';
import { supabase } from './supabase';

export const MODO_DEMO = !supabase;

const CONFIG_INICIAL: Config = { recordatorio_horas_antes: 24, recordatorio2_horas_antes: 2 };
const HORARIO_OCUPADO = 'Ese horario ya está ocupado. Elegí otro.';

const fallar = (error: { message: string; code?: string } | null) => {
  if (!error) return;
  if (error.code === '23505') throw new Error(HORARIO_OCUPADO);
  throw new Error(error.message);
};

// ---------- Modo demo (localStorage) ----------

const CLAVE = 'turnos-demo-v4';
const CLAVE_SESION = 'turnos-demo-sesion';
const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const armarEjemplos = (): Datos => {
  const pacientes: Paciente[] = PACIENTES_EJEMPLO.map((p) => ({ ...p, id: nuevoId() }));
  const turnos: Turno[] = turnosEjemplo().map((t) => ({
    id: nuevoId(), paciente_id: pacientes[t.indicePaciente].id, fecha: t.fecha, hora: t.hora, estado: t.estado, origen: t.origen, primera_vez: t.primera_vez,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  }));
  return { pacientes, turnos, bloqueos: [], config: { ...CONFIG_INICIAL } };
};

const leerLocal = (): Datos => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo) as Datos;
      // Si los turnos guardados quedaron todos en el pasado, se regeneran los ejemplos.
      datos.bloqueos = datos.bloqueos ?? [];
      if (datos.turnos.some((t) => t.fecha >= hoyIso()) || datos.turnos.length === 0) return datos;
    }
  } catch {
    /* se regenera abajo */
  }
  const datos = armarEjemplos();
  guardarLocal(datos);
  return datos;
};

const guardarLocal = (datos: Datos) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    /* sin almacenamiento: los cambios duran lo que dure la pestaña */
  }
};

// ---------- Sesión ----------

export async function obtenerSesion(): Promise<string | null> {
  if (!supabase) {
    try { return sessionStorage.getItem(CLAVE_SESION); } catch { return null; }
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

export async function ingresar(email: string, clave: string): Promise<string> {
  if (!email.trim() || !clave) throw new Error('Completá mail y contraseña.');
  if (!supabase) {
    try { sessionStorage.setItem(CLAVE_SESION, email.trim()); } catch { /* nada */ }
    return email.trim();
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Mail o contraseña incorrectos.' : error.message);
  return data.user?.email ?? email.trim();
}

export async function salir(): Promise<void> {
  if (!supabase) {
    try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
    return;
  }
  await supabase.auth.signOut();
}

// ---------- Lectura ----------

export async function cargarTodo(): Promise<Datos> {
  if (!supabase) return leerLocal();
  const [pacientes, turnos, bloqueos, config] = await Promise.all([
    supabase.from('pacientes').select('id,nombre,apellido,whatsapp,email,ciudad,edad,sexo,como_nos_conocio').order('apellido'),
    supabase.from('turnos').select('id,paciente_id,fecha,hora,estado,origen,primera_vez,created_at').gte('fecha', hoyIso()).order('fecha').order('hora'),
    supabase.from('bloqueos').select('id,fecha,hora').gte('fecha', hoyIso()).order('fecha'),
    supabase.from('configuracion').select('recordatorio_horas_antes,recordatorio2_horas_antes').eq('id', 1).maybeSingle(),
  ]);
  if (turnos.error?.code === '42703' || pacientes.error?.code === '42703' || config.error?.code === '42703' || bloqueos.error?.code === '42P01' || bloqueos.error?.code === 'PGRST205') {
    throw new Error('La base de datos está desactualizada: ejecutá de nuevo supabase/schema.sql en el SQL Editor de Supabase.');
  }
  fallar(pacientes.error);
  fallar(turnos.error);
  fallar(bloqueos.error);
  fallar(config.error);
  return {
    pacientes: (pacientes.data ?? []) as Paciente[],
    turnos: (turnos.data ?? []) as Turno[],
    bloqueos: (bloqueos.data ?? []) as Bloqueo[],
    config: (config.data as Config | null) ?? { ...CONFIG_INICIAL },
  };
}

// ---------- Pacientes ----------

export async function guardarPaciente(datos: DatosPaciente, id?: string): Promise<Paciente> {
  if (!supabase) {
    const todo = leerLocal();
    const paciente: Paciente = { ...datos, id: id ?? nuevoId() };
    todo.pacientes = id ? todo.pacientes.map((p) => (p.id === id ? paciente : p)) : [...todo.pacientes, paciente];
    guardarLocal(todo);
    return paciente;
  }
  const consulta = id
    ? supabase.from('pacientes').update(datos).eq('id', id).select().single()
    : supabase.from('pacientes').insert(datos).select().single();
  const { data, error } = await consulta;
  fallar(error);
  return data as Paciente;
}

// ---------- Turnos ----------

export async function crearTurno(turno: { paciente_id: string; fecha: string; hora: string }): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    if (todo.turnos.some((t) => ocupaLugar(t) && t.fecha === turno.fecha && t.hora === turno.hora)) throw new Error(HORARIO_OCUPADO);
    todo.turnos.push({ ...turno, id: nuevoId(), estado: 'pendiente', origen: 'consultorio', primera_vez: false, created_at: new Date().toISOString() });
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('turnos').insert({ ...turno, estado: 'pendiente' });
  fallar(error);
}

export async function actualizarTurno(id: string, cambios: Partial<Pick<Turno, 'fecha' | 'hora' | 'estado'>>): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    const actual = todo.turnos.find((t) => t.id === id);
    if (!actual) return;
    const nuevo = { ...actual, ...cambios };
    if (ocupaLugar(nuevo) && todo.turnos.some((t) => t.id !== id && ocupaLugar(t) && t.fecha === nuevo.fecha && t.hora === nuevo.hora)) throw new Error(HORARIO_OCUPADO);
    todo.turnos = todo.turnos.map((t) => (t.id === id ? nuevo : t));
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('turnos').update(cambios).eq('id', id);
  fallar(error);
}

export async function cancelarTurno(id: string): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    todo.turnos = todo.turnos.filter((t) => t.id !== id);
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('turnos').delete().eq('id', id);
  fallar(error);
}

// ---------- Bloqueos (días u horarios que el profesional cierra a mano) ----------

/** hora = null bloquea el día completo. */
export async function crearBloqueo(fecha: string, hora: string | null): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    if (!todo.bloqueos.some((b) => b.fecha === fecha && b.hora === hora)) todo.bloqueos.push({ id: nuevoId(), fecha, hora });
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('bloqueos').insert({ fecha, hora });
  if (error && error.code !== '23505') fallar(error);
}

export async function quitarBloqueo(id: string): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    todo.bloqueos = todo.bloqueos.filter((b) => b.id !== id);
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('bloqueos').delete().eq('id', id);
  fallar(error);
}

// ---------- Página pública de reserva (sin login) ----------
// En Supabase pasa por dos funciones (ver schema.sql) que no exponen datos de pacientes.

export async function horariosNoDisponibles(desde: string, hasta: string): Promise<NoDisponible[]> {
  if (!supabase) {
    const todo = leerLocal();
    const enRango = (f: string) => f >= desde && f <= hasta;
    return [
      ...todo.turnos.filter((t) => ocupaLugar(t) && enRango(t.fecha)).map((t) => ({ fecha: t.fecha, hora: t.hora })),
      ...todo.bloqueos.filter((b) => enRango(b.fecha)).map((b) => ({ fecha: b.fecha, hora: b.hora })),
    ];
  }
  const { data, error } = await supabase.rpc('horarios_no_disponibles', { desde, hasta });
  fallar(error);
  return (data ?? []) as NoDisponible[];
}

export interface PedidoReserva extends DatosPaciente {
  fecha: string;
  hora: string;
  primera_vez: boolean;
}

/** ok: reservado · ocupado: alguien lo tomó antes · limite: ya tiene 2 turnos pendientes · invalido: datos u horario incorrectos. */
export type ResultadoReserva = 'ok' | 'ocupado' | 'limite' | 'invalido';

const ultimosDigitos = (telefono: string) => telefono.replace(/\D/g, '').slice(-10);

export async function reservarTurno(p: PedidoReserva): Promise<ResultadoReserva> {
  if (!supabase) {
    const todo = leerLocal();
    if (!slotsDe(p.fecha).includes(p.hora) || yaPaso(p.fecha, p.hora) || p.fecha > sumarDias(hoyIso(), DIAS_RESERVA)) return 'invalido';
    if (todo.turnos.some((t) => ocupaLugar(t) && t.fecha === p.fecha && t.hora === p.hora)) return 'ocupado';
    if (todo.bloqueos.some((b) => b.fecha === p.fecha && (b.hora === null || b.hora === p.hora))) return 'ocupado';
    let paciente = todo.pacientes.find((x) => ultimosDigitos(x.whatsapp) === ultimosDigitos(p.whatsapp));
    if (!paciente) {
      paciente = { id: nuevoId(), nombre: p.nombre, apellido: p.apellido, whatsapp: p.whatsapp, email: p.email, ciudad: p.ciudad, edad: p.edad, sexo: p.sexo, como_nos_conocio: p.como_nos_conocio };
      todo.pacientes.push(paciente);
    } else if (todo.turnos.filter((t) => ocupaLugar(t) && t.paciente_id === paciente!.id && t.fecha >= hoyIso()).length >= 2) {
      return 'limite';
    }
    todo.turnos.push({ id: nuevoId(), paciente_id: paciente.id, fecha: p.fecha, hora: p.hora, estado: 'pendiente', origen: 'link', primera_vez: p.primera_vez, created_at: new Date().toISOString() });
    guardarLocal(todo);
    return 'ok';
  }
  const { data, error } = await supabase.rpc('reservar_turno', {
    p_nombre: p.nombre, p_apellido: p.apellido, p_whatsapp: p.whatsapp, p_fecha: p.fecha, p_hora: p.hora,
    p_primera_vez: p.primera_vez, p_email: p.email, p_ciudad: p.ciudad, p_edad: p.edad, p_sexo: p.sexo, p_como_nos_conocio: p.como_nos_conocio,
  });
  fallar(error);
  return data as ResultadoReserva;
}

// ---------- Configuración ----------

export async function guardarConfig(config: Config): Promise<void> {
  if (!supabase) {
    const todo = leerLocal();
    todo.config = config;
    guardarLocal(todo);
    return;
  }
  const { error } = await supabase.from('configuracion').upsert({ id: 1, ...config });
  fallar(error);
}

// ---------- Datos de ejemplo (para mostrar la app con la base vacía) ----------

export async function cargarEjemplos(): Promise<void> {
  if (!supabase) {
    guardarLocal(armarEjemplos());
    return;
  }
  const { data, error } = await supabase.from('pacientes').insert(PACIENTES_EJEMPLO).select('id');
  fallar(error);
  const ids = (data ?? []).map((p) => p.id as string);
  const turnos = turnosEjemplo().map((t) => ({ paciente_id: ids[t.indicePaciente], fecha: t.fecha, hora: t.hora, estado: t.estado, origen: t.origen, primera_vez: t.primera_vez }));
  const resultado = await supabase.from('turnos').insert(turnos);
  fallar(resultado.error);
}
