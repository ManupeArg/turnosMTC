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
  /** Cómo conoció el consultorio: 'Red social', 'Recomendación' u 'Otro'. */
  como_nos_conocio: string | null;
  created_at?: string;
}

export type DatosPaciente = Omit<Paciente, 'id' | 'created_at'>;

export interface Turno {
  id: string;
  paciente_id: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  estado: Estado;
  /** Minutos que dura: 30 la primera vez, 15 para pacientes habituales. */
  duracion: number;
  /** Quién cargó el turno: el consultorio o el paciente desde el link público. */
  origen: 'consultorio' | 'link';
  primera_vez: boolean;
  /** Cuándo se cargó el turno (fecha y hora ISO). Define si llega a salir cada aviso. */
  created_at?: string;
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
  /** Minutos ocupados desde esa hora (los bloqueos ocupan un bloque de 15). */
  duracion?: number;
}

export interface Config {
  /** Recordatorio 1: 'dia_anterior_12' (el día anterior al mediodía) o una cantidad de horas antes ('24'). */
  aviso1: string;
  /** Recordatorio 2: '3h_1h_primeros' (3 horas antes; 1 hora antes para los turnos de 8:00 a 9:45),
   *  una cantidad de horas antes ('2') o 'ninguno'. */
  aviso2: string;
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

export const COMO_NOS_CONOCIO = ['Red social', 'Recomendación', 'Otro'];

