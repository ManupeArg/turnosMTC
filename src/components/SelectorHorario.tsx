import { diaCorto, horaLinda, slotsDe } from '../lib/fechas';
import type { Turno } from '../types';

interface Props {
  dias: string[];
  fecha: string;
  hora: string | null;
  turnos: Turno[];
  /** Turno que se está editando: su propio horario no cuenta como ocupado. */
  exceptoId?: string;
  onCambio: (fecha: string, hora: string | null) => void;
}

export const estaOcupado = (turnos: Turno[], fecha: string, hora: string, exceptoId?: string) =>
  turnos.some((t) => t.fecha === fecha && t.hora === hora && t.id !== exceptoId);

export const primerLibre = (turnos: Turno[], fecha: string, exceptoId?: string) =>
  slotsDe(fecha).find((h) => !estaOcupado(turnos, fecha, h, exceptoId)) ?? null;

export function SelectorHorario({ dias, fecha, hora, turnos, exceptoId, onCambio }: Props) {
  const elegirDia = (dia: string) => {
    const sigue = hora && slotsDe(dia).includes(hora) && !estaOcupado(turnos, dia, hora, exceptoId);
    onCambio(dia, sigue ? hora : primerLibre(turnos, dia, exceptoId));
  };

  return (
    <>
      <div className="campo">
        <span className="etiqueta">Día</span>
        <div className="chips">
          {dias.map((d) => (
            <button key={d} type="button" className={`chip ${d === fecha ? 'chip-activo' : ''}`} aria-pressed={d === fecha} onClick={() => elegirDia(d)}>
              {diaCorto(d)}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <span className="etiqueta">Horario (tachados: ocupados)</span>
        <div className="chips chips-horas">
          {slotsDe(fecha).map((h) => {
            const ocupado = estaOcupado(turnos, fecha, h, exceptoId);
            return (
              <button key={h} type="button" disabled={ocupado} className={`chip ${h === hora ? 'chip-activo' : ''}`} aria-pressed={h === hora} onClick={() => onCambio(fecha, h)}>
                {horaLinda(h)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
