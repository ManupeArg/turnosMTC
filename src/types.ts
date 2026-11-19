export type Estado = 'pendiente' | 'confirmado' | 'no_viene';

export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  whatsapp: string;
  email: string | null;
  ciudad: string | null;
  edad: number | null;
  sexo: string | null;
}

export type DatosPaciente = Omit<Paciente, 'id'>;

export interface Turno {
  id: string;
  paciente_id: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  estado: Estado;
  /** Quién cargó el turno: el consultorio o el paciente desde el link público. */
  origen: 'consultorio' | 'link';
  primera_vez: boolean;
}

/** Horario o día que el profesional cerró a mano. hora = null bloquea el día completo. */
export interface Bloqueo {
  id: string;
  fecha: string;
  hora: string | null;
}

/** Lo único que ve la página pública: qué horarios no se pueden elegir (sin datos de pacientes). */
export interface NoDisponible {
  fecha: string;
  hora: string | null;
}

export interface Config {
  recordatorio_cuando: 'dia_anterior' | 'mismo_dia';
  recordatorio_hora: string; // HH:MM
}

export interface Datos {
  pacientes: Paciente[];
  turnos: Turno[];
  bloqueos: Bloqueo[];
  config: Config;
}

export const ESTADOS: Record<Estado, { nombre: string; marca: string; clase: string }> = {
  confirmado: { nombre: 'Confirmado', marca: '✓', clase: 'est-ok' },
  pendiente: { nombre: 'Falta confirmación', marca: '?', clase: 'est-pend' },
  no_viene: { nombre: 'No viene', marca: '✕', clase: 'est-no' },
};

export const ORDEN_ESTADOS: Estado[] = ['confirmado', 'pendiente', 'no_viene'];

export const SEXOS = ['Femenino', 'Masculino', 'Otro'];
