import { slotsDe, yaPaso } from './fechas';

/** Dice si un horario NO se puede elegir (tiene turno, está bloqueado o ya pasó). */
export type Ocupado = (fecha: string, hora: string) => boolean;

interface ConFechaHora { id?: string; fecha: string; hora: string; estado?: string }

/** Un turno ocupa su horario salvo que el paciente haya avisado que no viene. */
export const ocupaLugar = (t: { estado?: string }) => t.estado !== 'no_viene';
interface ConBloqueo { fecha: string; hora: string | null }

export const diaBloqueado = <B extends ConBloqueo>(bloqueos: B[], fecha: string) => bloqueos.find((b) => b.fecha === fecha && b.hora === null);

export const horaBloqueada = <B extends ConBloqueo>(bloqueos: B[], fecha: string, hora: string) => bloqueos.find((b) => b.fecha === fecha && b.hora === hora);

export function crearOcupado(turnos: ConFechaHora[], bloqueos: ConBloqueo[], opciones: { exceptoId?: string; sinPasados?: boolean } = {}): Ocupado {
  return (fecha, hora) =>
    turnos.some((t) => ocupaLugar(t) && t.fecha === fecha && t.hora === hora && (!opciones.exceptoId || t.id !== opciones.exceptoId)) ||
    bloqueos.some((b) => b.fecha === fecha && (b.hora === null || b.hora === hora)) ||
    (!!opciones.sinPasados && yaPaso(fecha, hora));
}

export const primerLibre = (ocupado: Ocupado, fecha: string) => slotsDe(fecha).find((h) => !ocupado(fecha, h)) ?? null;

export const tieneLugar = (ocupado: Ocupado, fecha: string) => primerLibre(ocupado, fecha) !== null;
