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
}

export interface Config {
  recordatorio_cuando: 'dia_anterior' | 'mismo_dia';
  recordatorio_hora: string; // HH:MM
}

export interface Datos {
  pacientes: Paciente[];
  turnos: Turno[];
  config: Config;
}

export const ESTADOS: Record<Estado, { nombre: string; marca: string; clase: string }> = {
  confirmado: { nombre: 'Confirmado', marca: '✓', clase: 'est-ok' },
  pendiente: { nombre: 'Falta confirmación', marca: '?', clase: 'est-pend' },
  no_viene: { nombre: 'No viene', marca: '✕', clase: 'est-no' },
};

export const ORDEN_ESTADOS: Estado[] = ['confirmado', 'pendiente', 'no_viene'];

export const SEXOS = ['Femenino', 'Masculino', 'Otro'];
