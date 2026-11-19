import { useState } from 'react';
import { MARCA } from '../config';
import { avisosDe } from '../lib/avisos';
import { diaLargo, horaLinda } from '../lib/fechas';
import { cabe, crearOcupado } from '../lib/disponibilidad';
import { ESTADOS, ORDEN_ESTADOS, type Bloqueo, type Config, type Paciente, type Turno } from '../types';
import { Modal } from './Modal';
import { SelectorHorario } from './SelectorHorario';

interface Props {
  turno: Turno;
  paciente: Paciente;
  turnos: Turno[];
  bloqueos: Bloqueo[];
  dias: string[];
  config: Config;
  onCambiar: (cambios: Partial<Pick<Turno, 'fecha' | 'hora' | 'estado' | 'duracion'>>) => void;
  onCancelar: () => void;
  onCerrar: () => void;
}

export function TurnoModal({ turno, paciente, turnos, bloqueos, dias, config, onCambiar, onCancelar, onCerrar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const avisos = avisosDe(turno, turnos, config);
  const ocupado = crearOcupado(turnos, bloqueos, { exceptoId: turno.id });
  const duraciones = [15, 30];
  const diasConTurno = dias.includes(turno.fecha) ? dias : [turno.fecha, ...dias];

  return (
    <Modal titulo={`${paciente.nombre} ${paciente.apellido}`} subtitulo={`${diaLargo(turno.fecha)} · ${horaLinda(turno.hora)} · ${turno.duracion} min · ${paciente.whatsapp}`} onCerrar={onCerrar}>
      {(turno.origen === 'link' || turno.primera_vez) && (
        <div className="chips">
          {turno.origen === 'link' && <span className="pastilla pastilla-gris">Reservado por el link</span>}
          {turno.primera_vez && <span className="pastilla pastilla-amarilla">Primera vez</span>}
        </div>
      )}
      <div className="campo">
        <span className="etiqueta">Estado</span>
        <div className="chips">
          {ORDEN_ESTADOS.map((e) => (
            <button key={e} type="button" aria-pressed={turno.estado === e} className={`chip chip-estado ${turno.estado === e ? ESTADOS[e].clase : ''}`} onClick={() => onCambiar({ estado: e })}>
              {ESTADOS[e].marca} {ESTADOS[e].nombre}
            </button>
          ))}
        </div>
      </div>

      {turno.estado === 'no_viene' && <p className="nota">Avisó que no viene: este día y horario quedó libre para que lo tome otro paciente.</p>}

      <div className="wa">
        <div className="wa-titulo">Recordatorio por WhatsApp</div>
        <ul className="avisos">
          {avisos.map((a) => (
            <li key={a.nombre}>
              <strong>{a.nombre}</strong> · {a.regla}: {a.seEnvia ? `sale el ${a.cuando}` : 'no se envía, el turno se reservó con menos anticipación'}
            </li>
          ))}
        </ul>
        <div className="wa-globo">
          Hola {paciente.nombre}, te recordamos tu turno en {MARCA.consultorio} el {diaLargo(turno.fecha)} a las {horaLinda(turno.hora)}. ¿Venís?
        </div>
        <div className="suave chico">Demo: probá cómo responde el paciente.</div>
        <div className="chips">
          <button type="button" className="btn btn-borde btn-pastilla" onClick={() => onCambiar({ estado: 'confirmado' })}>Sí, confirmo</button>
          <button type="button" className="btn btn-borde btn-pastilla" onClick={() => onCambiar({ estado: 'no_viene' })}>No puedo ir</button>
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta">Duración</span>
        <div className="chips">
          {duraciones.map((d) => (
            <button key={d} type="button" aria-pressed={turno.duracion === d} disabled={turno.duracion !== d && !cabe(ocupado, turno.fecha, turno.hora, d)}
              className={`chip ${turno.duracion === d ? 'chip-activo' : ''}`} onClick={() => turno.duracion !== d && onCambiar({ duracion: d })}>
              {d} minutos
            </button>
          ))}
        </div>
      </div>

      <SelectorHorario
        dias={diasConTurno} fecha={turno.fecha} hora={turno.hora} duracion={turno.duracion} ocupado={ocupado}
        onCambio={(fecha, hora) => hora && onCambiar({ fecha, hora })}
      />

      <div className="modal-pie">
        {confirmando ? (
          <div className="chips">
            <button type="button" className="btn btn-peligro" onClick={onCancelar}>Sí, cancelar el turno</button>
            <button type="button" className="btn btn-borde" onClick={() => setConfirmando(false)}>No</button>
          </div>
        ) : (
          <button type="button" className="btn btn-peligro-borde" onClick={() => setConfirmando(true)}>Cancelar turno</button>
        )}
        <button type="button" className="btn btn-primario" onClick={onCerrar}>Listo</button>
      </div>
    </Modal>
  );
}
