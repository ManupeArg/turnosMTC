import { useState } from 'react';
import { MARCA } from '../config';
import { diaLargo, horaLinda } from '../lib/fechas';
import { ESTADOS, ORDEN_ESTADOS, type Config, type Paciente, type Turno } from '../types';
import { Modal } from './Modal';
import { SelectorHorario } from './SelectorHorario';

interface Props {
  turno: Turno;
  paciente: Paciente;
  turnos: Turno[];
  dias: string[];
  config: Config;
  onCambiar: (cambios: Partial<Pick<Turno, 'fecha' | 'hora' | 'estado'>>) => void;
  onCancelar: () => void;
  onCerrar: () => void;
}

export function TurnoModal({ turno, paciente, turnos, dias, config, onCambiar, onCancelar, onCerrar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const diasConTurno = dias.includes(turno.fecha) ? dias : [turno.fecha, ...dias];
  const cuando = config.recordatorio_cuando === 'dia_anterior' ? 'el día anterior' : 'el mismo día';

  return (
    <Modal titulo={`${paciente.nombre} ${paciente.apellido}`} subtitulo={`${diaLargo(turno.fecha)} · ${horaLinda(turno.hora)} · ${paciente.whatsapp}`} onCerrar={onCerrar}>
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

      <div className="wa">
        <div className="wa-titulo">Recordatorio por WhatsApp · se envía {cuando} a las {config.recordatorio_hora}</div>
        <div className="wa-globo">
          Hola {paciente.nombre}, te recordamos tu turno en {MARCA.consultorio} el {diaLargo(turno.fecha)} a las {horaLinda(turno.hora)}. ¿Venís?
        </div>
        <div className="suave chico">Demo: probá cómo responde el paciente.</div>
        <div className="chips">
          <button type="button" className="btn btn-borde btn-pastilla" onClick={() => onCambiar({ estado: 'confirmado' })}>Sí, confirmo</button>
          <button type="button" className="btn btn-borde btn-pastilla" onClick={() => onCambiar({ estado: 'no_viene' })}>No puedo ir</button>
        </div>
      </div>

      <SelectorHorario
        dias={diasConTurno} fecha={turno.fecha} hora={turno.hora} turnos={turnos} exceptoId={turno.id}
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
