import { useEffect, useState } from 'react';
import { primerLibre, type Ocupado } from '../lib/disponibilidad';
import { diaConMes, horaLinda, slotsDe } from '../lib/fechas';

interface Props {
  /** Todos los días que se pueden elegir; se muestran de a 6, con flechas para avanzar. */
  dias: string[];
  fecha: string;
  hora: string | null;
  ocupado: Ocupado;
  /** Página pública: muestra solo los horarios libres en vez de tacharlos. */
  soloLibres?: boolean;
  onCambio: (fecha: string, hora: string | null) => void;
}

const POR_PAGINA = 6;

export function SelectorHorario({ dias, fecha, hora, ocupado, soloLibres, onCambio }: Props) {
  const paginaDe = (f: string) => Math.max(0, Math.floor(dias.indexOf(f) / POR_PAGINA));
  const [pagina, setPagina] = useState(() => paginaDe(fecha));
  const ultima = Math.max(0, Math.ceil(dias.length / POR_PAGINA) - 1);

  // Si cambia la lista de días (se ocupó alguno), vuelve a la página del día elegido.
  useEffect(() => { setPagina(paginaDe(fecha)); }, [dias.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const actual = Math.min(pagina, ultima);
  const visibles = dias.slice(actual * POR_PAGINA, actual * POR_PAGINA + POR_PAGINA);
  const elegirDia = (dia: string) => {
    const sigue = hora && slotsDe(dia).includes(hora) && !ocupado(dia, hora);
    onCambio(dia, sigue ? hora : primerLibre(ocupado, dia));
  };
  const horarios = slotsDe(fecha).filter((h) => !soloLibres || !ocupado(fecha, h));

  return (
    <>
      <div className="campo">
        <span className="etiqueta">Día</span>
        <div className="dias-paginados">
          <button type="button" className="btn btn-flecha" disabled={actual === 0} onClick={() => setPagina(actual - 1)} aria-label="Días anteriores">‹</button>
          <div className="chips chips-dias">
            {visibles.map((d) => (
              <button key={d} type="button" className={`chip ${d === fecha ? 'chip-activo' : ''}`} aria-pressed={d === fecha} onClick={() => elegirDia(d)}>
                {diaConMes(d)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-flecha" disabled={actual >= ultima} onClick={() => setPagina(actual + 1)} aria-label="Días siguientes">›</button>
        </div>
      </div>
      <div className="campo">
        <span className="etiqueta">{soloLibres ? `Horarios disponibles el ${diaConMes(fecha)}` : `Horario del ${diaConMes(fecha)} (tachados: ocupados o bloqueados)`}</span>
        <div className="chips chips-horas">
          {horarios.map((h) => (
            <button key={h} type="button" disabled={ocupado(fecha, h)} className={`chip ${h === hora ? 'chip-activo' : ''}`} aria-pressed={h === hora} onClick={() => onCambio(fecha, h)}>
              {horaLinda(h)}
            </button>
          ))}
        </div>
        {horarios.length === 0 && <p className="suave">No quedan horarios libres ese día.</p>}
      </div>
    </>
  );
}
