import type { DatosPaciente, Estado } from '../types';
import { duracionDe } from '../config';
import { proximosDiasHabiles, slotsDe } from './fechas';

// Pacientes ficticios para mostrar la app. No son personas reales.
export const PACIENTES_EJEMPLO: DatosPaciente[] = [
  { nombre: 'Lucía', apellido: 'Fernández', whatsapp: '+54 9 385 555-0101', email: 'lucia.fernandez@example.com', ciudad: 'Santiago del Estero', edad: 34, sexo: 'Femenino', como_nos_conocio: 'Recomendación' },
  { nombre: 'Martín', apellido: 'Acosta', whatsapp: '+54 9 385 555-0102', email: null, ciudad: 'La Banda', edad: 47, sexo: 'Masculino', como_nos_conocio: 'Red social' },
  { nombre: 'Carolina', apellido: 'Ruiz', whatsapp: '+54 9 385 555-0103', email: 'caro.ruiz@example.com', ciudad: 'Santiago del Estero', edad: 29, sexo: 'Femenino', como_nos_conocio: 'Red social' },
  { nombre: 'Joaquín', apellido: 'Paz', whatsapp: '+54 9 385 555-0104', email: null, ciudad: 'Santiago del Estero', edad: 52, sexo: 'Masculino', como_nos_conocio: 'Recomendación' },
  { nombre: 'Valentina', apellido: 'Sosa', whatsapp: '+54 9 385 555-0105', email: null, ciudad: 'Termas de Río Hondo', edad: 41, sexo: 'Femenino', como_nos_conocio: 'Otro' },
  { nombre: 'Diego', apellido: 'Herrera', whatsapp: '+54 9 385 555-0106', email: 'dherrera@example.com', ciudad: 'La Banda', edad: 38, sexo: 'Masculino', como_nos_conocio: null },
  { nombre: 'Florencia', apellido: 'Gómez', whatsapp: '+54 9 385 555-0107', email: null, ciudad: 'Santiago del Estero', edad: 26, sexo: 'Femenino', como_nos_conocio: 'Red social' },
  { nombre: 'Tomás', apellido: 'Ledesma', whatsapp: '+54 9 385 555-0108', email: null, ciudad: 'Santiago del Estero', edad: 63, sexo: 'Masculino', como_nos_conocio: 'Recomendación' },
];

/** Turnos de ejemplo: [índice de día hábil, índice de horario, índice de paciente, estado]. */
const PLAN: [number, number, number, Estado, boolean?][] = [
  [0, 0, 0, 'confirmado'], [0, 1, 1, 'confirmado'], [0, 3, 2, 'pendiente'], [0, 5, 3, 'no_viene'],
  [0, 8, 4, 'confirmado'], [0, 10, 5, 'pendiente'], [0, 13, 6, 'pendiente'],
  [1, 0, 7, 'pendiente', true], [1, 2, 0, 'confirmado'], [1, 6, 2, 'pendiente'], [1, 9, 4, 'pendiente'],
  [2, 1, 5, 'pendiente', true], [2, 4, 1, 'confirmado'], [2, 7, 3, 'pendiente'],
  [3, 0, 6, 'pendiente'], [3, 3, 7, 'pendiente'],
  [4, 2, 2, 'pendiente'], [4, 5, 0, 'pendiente'],
];

export const turnosEjemplo = () => {
  const dias = proximosDiasHabiles();
  const turnos: { indicePaciente: number; fecha: string; hora: string; estado: Estado; duracion: number; origen: 'consultorio' | 'link'; primera_vez: boolean }[] = [];
  for (const [d, s, p, estado, porLink] of PLAN) {
    const fecha = dias[d];
    if (!fecha) continue;
    const slots = slotsDe(fecha);
    // Los bloques son de 15 minutos: se usan los pares para que caigan en punto o y media.
    const hora = slots[(s * 2) % slots.length];
    if (turnos.some((t) => t.fecha === fecha && t.hora === hora)) continue;
    turnos.push({ indicePaciente: p, fecha, hora, estado, duracion: duracionDe(!!porLink), origen: porLink ? 'link' : 'consultorio', primera_vez: !!porLink });
  }
  return turnos;
};
