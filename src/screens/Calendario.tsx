import { useState } from 'react';
import { diaCorto, diaLargo, filasCalendario, horaLinda, hoyIso, slotsDe } from '../lib/fechas';
import { useEsMovil } from '../lib/useEsMovil';
import { ESTADOS, ORDEN_ESTADOS, type Datos, type Turno } from '../types';

interface Props {
  datos: Datos;
  dias: string[];
  onAbrirTurno: (id: string) => void;
  onAgregar: (fecha: string, hora?: string) => void;
}

export function Calendario({ datos, dias, onAbrirTurno, onAgregar }: Props) {
  const esMovil = useEsMovil();
  const [diaMovil, setDiaMovil] = useState(dias[0]);
  const hoy = hoyIso();
  const filas = filasCalendario();
  const nombre = (t: Turno) => {
    const p = datos.pacientes.find((x) => x.id === t.paciente_id);
    return p ? `${p.nombre} ${p.apellido}` : 'Paciente';
  };
  const turnoEn = (fecha: string, hora: string) => datos.turnos.find((t) => t.fecha === fecha && t.hora === hora);
  const cantidad = (fecha: string) => datos.turnos.filter((t) => t.fecha === fecha).length;
  const textoCantidad = (c: number) => (c === 0 ? 'Sin turnos' : c === 1 ? '1 turno' : `${c} turnos`);

  const cabecera = (
    <header className="cabecera-pantalla">
      <div>
        <h1>Calendario</h1>
        <p className="suave">Tocá un turno para editarlo o un horario libre para agregar uno.</p>
      </div>
      <div className="chips">
        {ORDEN_ESTADOS.map((e) => <span key={e} className={`pastilla ${ESTADOS[e].clase}`}>{ESTADOS[e].marca} {ESTADOS[e].nombre}</span>)}
      </div>
    </header>
  );

  if (esMovil) {
    const dia = dias.includes(diaMovil) ? diaMovil : dias[0];
    return (
      <div className="pantalla">
        {cabecera}
        <div className="tira-dias">
          {dias.map((d) => (
            <button key={d} type="button" aria-pressed={d === dia} aria-label={`${diaLargo(d)}, ${textoCantidad(cantidad(d))}`} className={`dia-pill ${d === dia ? 'dia-pill-activo' : ''}`} onClick={() => setDiaMovil(d)}>
              <span>{diaCorto(d).split(' ')[0]}</span>
              <strong>{diaCorto(d).split(' ')[1]}</strong>
              <span className="dia-pill-n">{cantidad(d) || '–'}</span>
            </button>
          ))}
        </div>
        <h2>{dia === hoy ? 'Hoy, ' : ''}{diaLargo(dia)}</h2>
        <div className="agenda-movil">
          {slotsDe(dia).map((h) => {
            const t = turnoEn(dia, h);
            return t ? (
              <button key={h} type="button" className={`agenda-fila ${ESTADOS[t.estado].clase}`} onClick={() => onAbrirTurno(t.id)}>
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><strong>{nombre(t)}</strong><span>{ESTADOS[t.estado].marca} {ESTADOS[t.estado].nombre}</span></span>
              </button>
            ) : (
              <button key={h} type="button" className="agenda-fila agenda-libre" onClick={() => onAgregar(dia, h)}>
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><span>Libre · + Agregar turno</span></span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="pantalla">
      {cabecera}
      <div className="cal-caja">
        <div className="cal" style={{ gridTemplateColumns: `60px repeat(${dias.length}, minmax(0, 1fr))` }}>
          <div />
          {dias.map((d) => (
            <div key={d} className={`cal-dia ${d === hoy ? 'cal-dia-hoy' : ''}`}>
              <strong>{d === hoy ? 'Hoy · ' : ''}{diaCorto(d)}</strong>
              <span>{textoCantidad(cantidad(d))}</span>
            </div>
          ))}
          {filas.map((h, i) => {
            const corte = i > 0 && Number(h.slice(0, 2)) - Number(filas[i - 1].slice(0, 2)) > 1;
            return (
              <div key={h} className="cal-fila" style={{ display: 'contents' }}>
                <div className={`cal-hora ${corte ? 'cal-corte' : ''}`}>{h.endsWith(':00') ? horaLinda(h) : ''}</div>
                {dias.map((d) => {
                  const t = turnoEn(d, h);
                  const abierto = slotsDe(d).includes(h);
                  return (
                    <div key={d} className={`cal-celda ${corte ? 'cal-corte' : ''} ${h.endsWith(':00') ? 'cal-en-punto' : ''}`}>
                      {t ? (
                        <button type="button" className={`cal-turno ${ESTADOS[t.estado].clase}`} onClick={() => onAbrirTurno(t.id)}
                          aria-label={`${nombre(t)}, ${diaLargo(d)} ${horaLinda(h)}, ${ESTADOS[t.estado].nombre}`}>
                          <span aria-hidden="true">{ESTADOS[t.estado].marca}</span>
                          <span className="cal-turno-nombre">{nombre(t)}</span>
                        </button>
                      ) : abierto ? (
                        <button type="button" className="cal-libre" onClick={() => onAgregar(d, h)} aria-label={`Agregar turno el ${diaLargo(d)} a las ${horaLinda(h)}`}>+ Turno</button>
                      ) : (
                        <div className="cal-cerrado" title="No se atiende" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
