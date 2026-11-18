// Capa de datos. Con Supabase configurado lee y escribe ahí;
// sin configurar, guarda todo en el navegador (modo demo) para poder probar la app al toque.
import type { Config, Datos, DatosPaciente, Paciente, Turno } from '../types';
import { PACIENTES_EJEMPLO, turnosEjemplo } from './ejemplos';
import { hoyIso } from './fechas';
import { supabase } from './supabase';

export const MODO_DEMO = !supabase;

const CONFIG_INICIAL: Config = { recordatorio_cuando: 'dia_anterior', recordatorio_hora: '18:00' };
const HORARIO_OCUPADO = 'Ese horario ya está ocupado. Elegí otro.';

const fallar = (error: { message: string; code?: string } | null) => {
  if (!error) return;
  if (error.code === '23505') throw new Error(HORARIO_OCUPADO);
  throw new Error(error.message);
};

// ---------- Modo demo (localStorage) ----------

const CLAVE = 'turnos-demo-v1';
const CLAVE_SESION = 'turnos-demo-sesion';
const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const armarEjemplos = (): Datos => {
  const pacientes: Paciente[] = PACIENTES_EJEMPLO.map((p) => ({ ...p, id: nuevoId() }));
  const turnos: Turno[] = turnosEjemplo().map((t) => ({
    id: nuevoId(), paciente_id: pacientes[t.indicePaciente].id, fecha: t.fecha, hora: t.hora, estado: t.estado,
  }));
  return { pacientes, turnos, config: { ...CONFIG_INICIAL } };
};

const leerLocal = (): Datos => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo) as Datos;
      // Si los turnos guardados quedaron todos en el pasado, se regeneran los ejemplos.
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
  const [pacientes, turnos, config] = await Promise.all([
    supabase.from('pacientes').select('id,nombre,apellido,whatsapp,email,ciudad,edad,sexo').order('apellido'),
    supabase.from('turnos').select('id,paciente_id,fecha,hora,estado').gte('fecha', hoyIso()).order('fecha').order('hora'),
    supabase.from('configuracion').select('recordatorio_cuando,recordatorio_hora').eq('id', 1).maybeSingle(),
  ]);
  fallar(pacientes.error);
  fallar(turnos.error);
  fallar(config.error);
  return {
    pacientes: (pacientes.data ?? []) as Paciente[],
    turnos: (turnos.data ?? []) as Turno[],
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
    if (todo.turnos.some((t) => t.fecha === turno.fecha && t.hora === turno.hora)) throw new Error(HORARIO_OCUPADO);
    todo.turnos.push({ ...turno, id: nuevoId(), estado: 'pendiente' });
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
    if (todo.turnos.some((t) => t.id !== id && t.fecha === nuevo.fecha && t.hora === nuevo.hora)) throw new Error(HORARIO_OCUPADO);
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
  const turnos = turnosEjemplo().map((t) => ({ paciente_id: ids[t.indicePaciente], fecha: t.fecha, hora: t.hora, estado: t.estado }));
  const resultado = await supabase.from('turnos').upsert(turnos, { onConflict: 'fecha,hora', ignoreDuplicates: true });
  fallar(resultado.error);
}
