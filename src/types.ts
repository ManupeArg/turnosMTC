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
}

export interface Config {
  /** Primer aviso por WhatsApp: cuántas horas antes de cada turno se envía. */
  recordatorio_horas_antes: number;
  /** Segundo aviso: horas antes del turno, o null si no se envía. */
  recordatorio2_horas_antes: number | null;
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

/** Opciones rápidas para el recordatorio (horas antes del turno). */
export const HORAS_RECORDATORIO = [1, 2, 3, 4, 12, 24, 48];
