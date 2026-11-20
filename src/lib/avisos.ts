// Reglas de los recordatorios por WhatsApp: cuándo sale cada uno y si llega a enviarse.
import { aIso, deIso, diaLargo } from './fechas';
import type { Config, Turno } from '../types';

export const AVISO1_PREDETERMINADO = 'dia_anterior_12';
export const AVISO2_PREDETERMINADO = '3h_1h_primeros';
export const HORAS_AVISO = [1, 2, 3, 4, 12, 24, 48];

/** Con el recordatorio 2 predeterminado, los turnos que empiezan antes de esta hora (de 8:00 a 9:45)
 *  reciben el aviso 1 hora antes en vez de 3, para que no llegue de madrugada. */
export const HORA_LIMITE_TEMPRANOS = '10:00';

const horas = (n: number) => (n === 1 ? '1 hora antes' : `${n} horas antes`);

export const OPCIONES_AVISO1 = [
  { valor: AVISO1_PREDETERMINADO, texto: 'El día anterior al mediodía (predeterminado)' },
  ...HORAS_AVISO.map((h) => ({ valor: String(h), texto: horas(h) })),
];

export const OPCIONES_AVISO2 = [
  { valor: AVISO2_PREDETERMINADO, texto: '3 horas antes; 1 hora antes para los turnos de 8:00 a 9:45 (predeterminado)' },
  ...HORAS_AVISO.map((h) => ({ valor: String(h), texto: horas(h) })),
  { valor: 'ninguno', texto: 'No enviar segundo recordatorio' },
];

export interface Aviso {
  nombre: string;
  /** La regla en palabras: "el día anterior al mediodía", "1 hora antes, por ser un turno de 8:00 a 9:45". */
  regla: string;
  /** Cuándo sale: "miércoles 18/11 a las 12:00". */
  cuando: string;
  /** false si el turno se cargó después de ese momento: ese aviso ya no sale. */
  seEnvia: boolean;
}

type TurnoMinimo = Pick<Turno, 'fecha' | 'hora' | 'estado'> & { id?: string; created_at?: string };

const inicio = (t: TurnoMinimo) => {
  const d = deIso(t.fecha);
  d.setHours(Number(t.hora.slice(0, 2)), Number(t.hora.slice(3, 5)), 0, 0);
  return d;
};

const armar = (nombre: string, regla: string, sale: Date, creado?: string): Aviso => ({
  nombre,
  regla,
  cuando: `${diaLargo(aIso(sale))} a las ${sale.getHours()}:${String(sale.getMinutes()).padStart(2, '0')}`,
  seEnvia: !creado || new Date(creado).getTime() <= sale.getTime(),
});

/** Los recordatorios de un turno: cuándo sale cada uno y si llega a enviarse. */
export function avisosDe(turno: TurnoMinimo, _turnos: TurnoMinimo[], config: Config): Aviso[] {
  const avisos: Aviso[] = [];
  const cuandoEs = inicio(turno);

  const uno = new Date(cuandoEs);
  if (config.aviso1 === AVISO1_PREDETERMINADO) {
    uno.setDate(uno.getDate() - 1);
    uno.setHours(12, 0, 0, 0);
    avisos.push(armar('Recordatorio 1', 'el día anterior al mediodía', uno, turno.created_at));
  } else {
    const h = Number(config.aviso1) || 24;
    uno.setHours(uno.getHours() - h);
    avisos.push(armar('Recordatorio 1', horas(h), uno, turno.created_at));
  }

  if (config.aviso2 !== 'ninguno') {
    const dos = new Date(cuandoEs);
    if (config.aviso2 === AVISO2_PREDETERMINADO) {
      const temprano = turno.hora < HORA_LIMITE_TEMPRANOS;
      dos.setHours(dos.getHours() - (temprano ? 1 : 3));
      avisos.push(armar('Recordatorio 2', temprano ? '1 hora antes, por ser un turno de 8:00 a 9:45' : '3 horas antes', dos, turno.created_at));
    } else {
      const h = Number(config.aviso2) || 3;
      dos.setHours(dos.getHours() - h);
      avisos.push(armar('Recordatorio 2', horas(h), dos, turno.created_at));
    }
  }
  return avisos;
}
