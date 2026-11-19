import { PASO_MIN } from '../config';
import { aMinutos, deMinutos, slotsDe, yaPaso } from './fechas';

/** Dice si un bloque de 15 minutos NO está libre (lo cubre un turno, está bloqueado o ya pasó). */
export type Ocupado = (fecha: string, hora: string) => boolean;

interface ConFechaHora { id?: string; fecha: string; hora: string; duracion?: number; estado?: string }
interface ConBloqueo { fecha: string; hora: string | null }

/** Un turno ocupa su horario salvo que el paciente haya avisado que no viene. */
export const ocupaLugar = (t: { estado?: string }) => t.estado !== 'no_viene';

/** true si el turno cubre ese bloque (un turno de 30 minutos cubre dos bloques). */
export const cubre = (t: ConFechaHora, fecha: string, hora: string) => {
  if (t.fecha !== fecha) return false;
  const inicio = aMinutos(t.hora), m = aMinutos(hora);
  return m >= inicio && m < inicio + (t.duracion ?? PASO_MIN);
};

/** Bloques de 15 minutos que ocupa un turno que empieza a esa hora y dura esos minutos. */
export const bloquesDe = (hora: string, duracion: number) => {
  const bloques: string[] = [];
  for (let m = aMinutos(hora); m < aMinutos(hora) + duracion; m += PASO_MIN) bloques.push(deMinutos(m));
  return bloques;
};

export const diaBloqueado = <B extends ConBloqueo>(bloqueos: B[], fecha: string) => bloqueos.find((b) => b.fecha === fecha && b.hora === null);

export const horaBloqueada = <B extends ConBloqueo>(bloqueos: B[], fecha: string, hora: string) => bloqueos.find((b) => b.fecha === fecha && b.hora === hora);

export function crearOcupado(turnos: ConFechaHora[], bloqueos: ConBloqueo[], opciones: { exceptoId?: string; sinPasados?: boolean } = {}): Ocupado {
  return (fecha, hora) =>
    turnos.some((t) => ocupaLugar(t) && cubre(t, fecha, hora) && (!opciones.exceptoId || t.id !== opciones.exceptoId)) ||
    bloqueos.some((b) => b.fecha === fecha && (b.hora === null || b.hora === hora)) ||
    (!!opciones.sinPasados && yaPaso(fecha, hora));
}

/** Horarios en los que puede EMPEZAR un turno de esa duración: cada 15 minutos los de 15, cada 30 los de 30. */
export const iniciosDe = (fecha: string, duracion: number) => slotsDe(fecha).filter((h) => aMinutos(h) % duracion === 0);

/** true si un turno de esa duración entra completo a partir de esa hora (todos sus bloques libres y dentro del horario de atención). */
export const cabe = (ocupado: Ocupado, fecha: string, hora: string, duracion: number) => {
  const atencion = slotsDe(fecha);
  return aMinutos(hora) % duracion === 0 && bloquesDe(hora, duracion).every((b) => atencion.includes(b) && !ocupado(fecha, b));
};

export const primerLibre = (ocupado: Ocupado, fecha: string, duracion: number) => iniciosDe(fecha, duracion).find((h) => cabe(ocupado, fecha, h, duracion)) ?? null;

export const tieneLugar = (ocupado: Ocupado, fecha: string, duracion: number) => primerLibre(ocupado, fecha, duracion) !== null;
