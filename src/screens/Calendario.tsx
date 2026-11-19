import { useMemo, useState } from 'react';
import { diaBloqueado, horaBloqueada } from '../lib/disponibilidad';
import { Modal } from '../components/Modal';
import { DIAS_VISIBLES } from '../config';
import { diaConMes, diaCorto, diaLargo, filasCalendario, horaLinda, hoyIso, proximosDiasHabiles, slotsDe } from '../lib/fechas';
import { useEsMovil } from '../lib/useEsMovil';
import { ESTADOS, ORDEN_ESTADOS, type Datos, type Turno } from '../types';

interface Props {
  datos: Datos;
  onAbrirTurno: (id: string) => void;
  onAgregar: (fecha: string, hora?: string) => void;
  onBloquear: (fecha: string, hora: string | null) => void;
  onDesbloquear: (id: string) => void;
}

export function Calendario({ datos, onAbrirTurno, onAgregar, onBloquear, onDesbloquear }: Props) {
  const esMovil = useEsMovil();
  const [pagina, setPagina] = useState(0);
  /** Página 0 = desde hoy; cada página avanza DIAS_VISIBLES días hábiles. */
  const dias = useMemo(() => proximosDiasHabiles(DIAS_VISIBLES * (pagina + 1)).slice(-DIAS_VISIBLES), [pagina]);
  const [diaMovil, setDiaMovil] = useState(dias[0]);
  const [confirmar, setConfirmar] = useState<{ fecha: string; turnos: number } | null>(null);
  const [modoBloqueo, setModoBloqueo] = useState(false);
  const [otroDia, setOtroDia] = useState('');
  const hoy = hoyIso();
  const filas = filasCalendario();
  const { bloqueos } = datos;
  const nombre = (t: Turno) => {
    const p = datos.pacientes.find((x) => x.id === t.paciente_id);
    return p ? `${p.nombre} ${p.apellido}` : 'Paciente';
  };
  const turnoEn = (fecha: string, hora: string) => datos.turnos.find((t) => t.fecha === fecha && t.hora === hora);
  const cantidad = (fecha: string) => datos.turnos.filter((t) => t.fecha === fecha).length;
  const textoCantidad = (c: number) => (c === 0 ? 'Sin turnos' : c === 1 ? '1 turno' : `${c} turnos`);
  const diasCerrados = bloqueos.filter((b) => b.hora === null).sort((a, b) => a.fecha.localeCompare(b.fecha));

  /** Antes de bloquear un día con turnos cargados, avisa y pide confirmación. */
  const bloquearDia = (fecha: string) => {
    const n = cantidad(fecha);
    if (n > 0) setConfirmar({ fecha, turnos: n });
    else onBloquear(fecha, null);
  };

  const botonDia = (d: string) => {
    const b = diaBloqueado(bloqueos, d);
    return b
      ? <button type="button" className="btn btn-mini" onClick={() => onDesbloquear(b.id)}>Desbloquear día</button>
      : <button type="button" className="btn btn-mini" onClick={() => bloquearDia(d)}>Bloquear día</button>;
  };

  const navegacion = (
    <div className="cal-nav">
      <button type="button" className="btn btn-flecha" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)} aria-label="Días anteriores">‹</button>
      <span className="cal-rango">{diaConMes(dias[0])} al {diaConMes(dias[dias.length - 1])}</span>
      <button type="button" className="btn btn-flecha" onClick={() => setPagina(pagina + 1)} aria-label="Días siguientes">›</button>
      {pagina > 0 && <button type="button" className="btn btn-borde" onClick={() => setPagina(0)}>Volver a hoy</button>}
    </div>
  );

  const avisoBloqueo = confirmar && (
    <Modal titulo="¿Bloquear igual?" onCerrar={() => setConfirmar(null)}>
      <p>
        Tenés <strong>{confirmar.turnos === 1 ? '1 turno' : `${confirmar.turnos} turnos`}</strong> el {diaLargo(confirmar.fecha)}. ¿Querés bloquear el día igual?
      </p>
      <p className="suave">Los turnos ya cargados no se cancelan: quedan en la agenda para que los reprogrames o canceles vos.</p>
      <div className="modal-pie">
        <button type="button" className="btn btn-borde" onClick={() => setConfirmar(null)}>No, dejarlo abierto</button>
        <button type="button" className="btn btn-primario" onClick={() => { onBloquear(confirmar.fecha, null); setConfirmar(null); }}>Sí, bloquear igual</button>
      </div>
    </Modal>
  );

  const cabecera = (
    <>
      <header className="cabecera-pantalla">
        <div>
          <h1>Calendario</h1>
          <p className="suave">Tocá un turno para editarlo o un horario libre para agregar uno.</p>
        </div>
        <div className="chips">
          {ORDEN_ESTADOS.map((e) => <span key={e} className={`pastilla ${ESTADOS[e].clase}`}>{ESTADOS[e].marca} {ESTADOS[e].nombre}</span>)}
          <button type="button" aria-pressed={modoBloqueo} className={`btn ${modoBloqueo ? 'btn-oscuro' : 'btn-borde'}`} onClick={() => setModoBloqueo(!modoBloqueo)}>
            {modoBloqueo ? 'Terminar de bloquear' : 'Bloquear días y horarios'}
          </button>
        </div>
      </header>
      {modoBloqueo && (
        <section className="tarjeta panel-bloqueo">
          <p><strong>Modo bloqueo.</strong> Tocá un horario libre para bloquearlo y uno bloqueado para liberarlo. Lo bloqueado no se ofrece en el link de pacientes ni al cargar turnos.</p>
          <div className="chips">
            <label className="etiqueta" htmlFor="otro-dia">Bloquear un día completo</label>
            <input id="otro-dia" className="input-fecha" type="date" min={hoy} value={otroDia} onChange={(e) => setOtroDia(e.target.value)} />
            <button type="button" className="btn btn-primario" disabled={!otroDia} onClick={() => { bloquearDia(otroDia); setOtroDia(''); }}>Bloquear día</button>
          </div>
          {diasCerrados.length > 0 && (
            <div className="chips">
              <span className="etiqueta">Días bloqueados:</span>
              {diasCerrados.map((b) => (
                <button key={b.id} type="button" className="chip" onClick={() => onDesbloquear(b.id)} aria-label={`Desbloquear el ${diaLargo(b.fecha)}`}>
                  {diaConMes(b.fecha)} ✕
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {navegacion}
      {avisoBloqueo}
    </>
  );

  if (esMovil) {
    const dia = dias.includes(diaMovil) ? diaMovil : dias[0];
    const cerrado = diaBloqueado(bloqueos, dia);
    return (
      <div className="pantalla">
        {cabecera}
        <div className="tira-dias">
          {dias.map((d) => (
            <button key={d} type="button" aria-pressed={d === dia} aria-label={`${diaLargo(d)}, ${textoCantidad(cantidad(d))}`} className={`dia-pill ${d === dia ? 'dia-pill-activo' : ''}`} onClick={() => setDiaMovil(d)}>
              <span>{diaCorto(d).split(' ')[0]}</span>
              <strong>{diaCorto(d).split(' ')[1]}</strong>
              <span className="dia-pill-n">{diaBloqueado(bloqueos, d) ? 'Bloq.' : cantidad(d) || '–'}</span>
            </button>
          ))}
        </div>
        <div className="cabecera-pantalla">
          <h2>{dia === hoy ? 'Hoy, ' : ''}{diaLargo(dia)}{cerrado ? ' · día bloqueado' : ''}</h2>
          {modoBloqueo && botonDia(dia)}
        </div>
        <div className="agenda-movil">
          {slotsDe(dia).map((h) => {
            const t = turnoEn(dia, h);
            const b = horaBloqueada(bloqueos, dia, h);
            if (t) return (
              <button key={h} type="button" className={`agenda-fila ${ESTADOS[t.estado].clase}`} onClick={() => onAbrirTurno(t.id)}>
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><strong>{nombre(t)}</strong><span>{ESTADOS[t.estado].marca} {ESTADOS[t.estado].nombre}{t.primera_vez ? ' · Primera vez' : ''}</span></span>
              </button>
            );
            if (cerrado) return (
              <div key={h} className="agenda-fila agenda-bloqueada">
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><span>Bloqueado</span></span>
              </div>
            );
            if (b) return (
              <button key={h} type="button" className="agenda-fila agenda-bloqueada" disabled={!modoBloqueo} onClick={() => onDesbloquear(b.id)}>
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><span>{modoBloqueo ? 'Bloqueado · tocá para liberar' : 'Bloqueado'}</span></span>
              </button>
            );
            return (
              <button key={h} type="button" className="agenda-fila agenda-libre" onClick={() => (modoBloqueo ? onBloquear(dia, h) : onAgregar(dia, h))}>
                <span className="fila-hora">{horaLinda(h)}</span>
                <span className="agenda-texto"><span>{modoBloqueo ? 'Libre · tocá para bloquear' : 'Libre · + Agregar turno'}</span></span>
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
        <div className={`cal ${modoBloqueo ? 'cal-modo-bloqueo' : ''}`} style={{ gridTemplateColumns: `60px repeat(${dias.length}, minmax(0, 1fr))` }}>
          <div />
          {dias.map((d) => (
            <div key={d} className={`cal-dia ${d === hoy ? 'cal-dia-hoy' : ''}`}>
              <strong>{d === hoy ? 'Hoy · ' : ''}{diaCorto(d)}</strong>
              <span>{diaBloqueado(bloqueos, d) ? 'Día bloqueado' : textoCantidad(cantidad(d))}</span>
              {modoBloqueo && botonDia(d)}
            </div>
          ))}
          {filas.map((h, i) => {
            const corte = i > 0 && Number(h.slice(0, 2)) - Number(filas[i - 1].slice(0, 2)) > 1;
            return (
              <div key={h} style={{ display: 'contents' }}>
                <div className={`cal-hora ${corte ? 'cal-corte' : ''}`}>{h.endsWith(':00') ? horaLinda(h) : ''}</div>
                {dias.map((d) => {
                  const t = turnoEn(d, h);
                  const abierto = slotsDe(d).includes(h);
                  const b = horaBloqueada(bloqueos, d, h);
                  let contenido;
                  if (t) {
                    contenido = (
                      <button type="button" className={`cal-turno ${ESTADOS[t.estado].clase}`} onClick={() => onAbrirTurno(t.id)}
                        aria-label={`${nombre(t)}, ${diaLargo(d)} ${horaLinda(h)}, ${ESTADOS[t.estado].nombre}${t.primera_vez ? ', primera vez' : ''}`}>
                        <span aria-hidden="true">{ESTADOS[t.estado].marca}</span>
                        <span className="cal-turno-nombre">{nombre(t)}</span>
                        {t.primera_vez && <span className="cal-nuevo" title="Primera vez">1ª</span>}
                      </button>
                    );
                  } else if (!abierto) {
                    contenido = <div className="cal-cerrado" title="No se atiende" />;
                  } else if (diaBloqueado(bloqueos, d)) {
                    contenido = <div className="cal-bloqueado">Bloqueado</div>;
                  } else if (b) {
                    contenido = modoBloqueo
                      ? <button type="button" className="cal-bloqueado" onClick={() => onDesbloquear(b.id)} aria-label={`Liberar el ${diaLargo(d)} a las ${horaLinda(h)}`}>Bloqueado ✕</button>
                      : <div className="cal-bloqueado">Bloqueado</div>;
                  } else if (modoBloqueo) {
                    contenido = <button type="button" className="cal-libre" onClick={() => onBloquear(d, h)} aria-label={`Bloquear el ${diaLargo(d)} a las ${horaLinda(h)}`}>Bloquear</button>;
                  } else {
                    contenido = <button type="button" className="cal-libre" onClick={() => onAgregar(d, h)} aria-label={`Agregar turno el ${diaLargo(d)} a las ${horaLinda(h)}`}>+ Turno</button>;
                  }
                  return <div key={d} className={`cal-celda ${corte ? 'cal-corte' : ''} ${h.endsWith(':00') ? 'cal-en-punto' : ''}`}>{contenido}</div>;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
