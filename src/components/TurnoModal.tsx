import { useState } from 'react';
import { MARCA } from '../config';
import { diaLargo, horaLinda, horasAntes, momentoAntes } from '../lib/fechas';
import { crearOcupado } from '../lib/disponibilidad';
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
  onCambiar: (cambios: Partial<Pick<Turno, 'fecha' | 'hora' | 'estado'>>) => void;
  onCancelar: () => void;
  onCerrar: () => void;
}

export function TurnoModal({ turno, paciente, turnos, bloqueos, dias, config, onCambiar, onCancelar, onCerrar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const diasConTurno = dias.includes(turno.fecha) ? dias : [turno.fecha, ...dias];

  return (
    <Modal titulo={`${paciente.nombre} ${paciente.apellido}`} subtitulo={`${diaLargo(turno.fecha)} · ${horaLinda(turno.hora)} · ${paciente.whatsapp}`} onCerrar={onCerrar}>
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

      <div className="wa">
        <div className="wa-titulo">Recordatorio por WhatsApp · {horasAntes(config.recordatorio_horas_antes)} (sale el {momentoAntes(turno.fecha, turno.hora, config.recordatorio_horas_antes)})</div>
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
        dias={diasConTurno} fecha={turno.fecha} hora={turno.hora} ocupado={crearOcupado(turnos, bloqueos, { exceptoId: turno.id })}
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
