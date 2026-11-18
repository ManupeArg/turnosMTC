import { useMemo, useState } from 'react';
import type { Paciente, Turno } from '../types';
import { Modal } from './Modal';
import { primerLibre, SelectorHorario } from './SelectorHorario';

interface Props {
  pacientes: Paciente[];
  turnos: Turno[];
  dias: string[];
  inicial: { fecha?: string; hora?: string; pacienteId?: string };
  onGuardar: (pacienteId: string, fecha: string, hora: string) => void;
  onNuevoPaciente: () => void;
  onCerrar: () => void;
}

export function AgregarTurnoModal({ pacientes, turnos, dias, inicial, onGuardar, onNuevoPaciente, onCerrar }: Props) {
  const fechaInicial = inicial.fecha ?? dias[0];
  const [busqueda, setBusqueda] = useState('');
  const [pacienteId, setPacienteId] = useState<string | null>(inicial.pacienteId ?? null);
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState<string | null>(inicial.hora ?? primerLibre(turnos, fechaInicial));

  const encontrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pacientes
      .filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.id === pacienteId) - Number(a.id === pacienteId) || a.apellido.localeCompare(b.apellido))
      .slice(0, 5);
  }, [busqueda, pacientes, pacienteId]);

  const listo = pacienteId && hora;

  return (
    <Modal titulo="Agregar turno" onCerrar={onCerrar}>
      <div className="campo">
        <label className="etiqueta" htmlFor="buscar-paciente">Paciente guardado</label>
        <input id="buscar-paciente" type="search" placeholder="Buscá por nombre o apellido" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="lista-opciones">
          {encontrados.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === pacienteId} className={`opcion ${p.id === pacienteId ? 'opcion-activa' : ''}`} onClick={() => setPacienteId(p.id)}>
              <strong>{p.apellido}, {p.nombre}</strong>
              <span>{p.whatsapp}</span>
            </button>
          ))}
          {encontrados.length === 0 && <p className="suave">No hay pacientes con ese nombre.</p>}
        </div>
        <button type="button" className="btn-enlace" onClick={onNuevoPaciente}>¿Viene por primera vez? Cargar nuevo paciente</button>
      </div>

      <SelectorHorario dias={dias} fecha={fecha} hora={hora} turnos={turnos} onCambio={(f, h) => { setFecha(f); setHora(h); }} />

      <div className="modal-pie">
        <button type="button" className="btn btn-borde" onClick={onCerrar}>Cerrar</button>
        <button type="button" className="btn btn-primario" disabled={!listo} onClick={() => listo && onGuardar(pacienteId, fecha, hora)}>Guardar turno</button>
      </div>
    </Modal>
  );
}
