import { ATENCION, DIAS_VISIBLES, DURACION_MIN } from '../config';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dos = (n: number) => String(n).padStart(2, '0');

export const aIso = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

export const deIso = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const hoyIso = () => aIso(new Date());

export const sumarDias = (iso: string, n: number) => {
  const d = deIso(iso);
  d.setDate(d.getDate() + n);
  return aIso(d);
};

const franjasASlots = (franjas: [number, number][]) => {
  const slots: string[] = [];
  for (const [desde, hasta] of franjas) {
    for (let m = desde * 60; m < hasta * 60; m += DURACION_MIN) slots.push(`${dos(Math.floor(m / 60))}:${dos(m % 60)}`);
  }
  return slots;
};

/** Horarios en los que se atiende ese día. Vacío si el consultorio está cerrado. */
export const slotsDe = (iso: string) => franjasASlots(ATENCION[deIso(iso).getDay()] ?? []);

export const atiende = (iso: string) => slotsDe(iso).length > 0;

/** Todos los horarios posibles de la semana, ordenados (filas del calendario). */
export const filasCalendario = () => {
  const todas = new Set<string>();
  Object.values(ATENCION).forEach((f) => franjasASlots(f).forEach((s) => todas.add(s)));
  return [...todas].sort();
};

/** Hoy (si se atiende) y los días hábiles que siguen. */
export const proximosDiasHabiles = (n = DIAS_VISIBLES) => {
  const dias: string[] = [];
  let iso = hoyIso();
  for (let i = 0; dias.length < n && i < n * 7 + 14; i++) {
    if (atiende(iso)) dias.push(iso);
    iso = sumarDias(iso, 1);
  }
  return dias;
};

/** Todos los días hábiles entre hoy y una fecha (inclusive). */
export const diasHabilesHasta = (hasta: string) => {
  const dias: string[] = [];
  for (let iso = hoyIso(); iso <= hasta; iso = sumarDias(iso, 1)) if (atiende(iso)) dias.push(iso);
  return dias;
};

/** "Lun 23/11": día corto con el mes, para elegir fechas lejanas. */
export const diaConMes = (iso: string) => `${diaCorto(iso)}/${iso.slice(5, 7)}`;

export const diaLargo = (iso: string) => {
  const d = deIso(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()}/${dos(d.getMonth() + 1)}`;
};

export const diaCorto = (iso: string) => {
  const d = deIso(iso);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
};

export const fechaCompleta = (iso: string) => {
  const d = deIso(iso);
  const dia = DIAS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** true si ese horario ya pasó (solo puede pasar con la fecha de hoy o anteriores). */
export const yaPaso = (iso: string, hora: string) => {
  const ahora = new Date();
  const hoy = aIso(ahora);
  if (iso !== hoy) return iso < hoy;
  return hora <= `${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;
};

/** "8:00" en vez de "08:00", para mostrar. */
export const horaLinda = (hora: string) => hora.replace(/^0/, '');
