import { useMemo, useState } from 'react';
import { duracionDe } from '../config';
import { cabe, crearOcupado, primerLibre } from '../lib/disponibilidad';
import type { Bloqueo, Paciente, Turno } from '../types';
import { Modal } from './Modal';
import { SelectorHorario } from './SelectorHorario';

interface Props {
  pacientes: Paciente[];
  turnos: Turno[];
  bloqueos: Bloqueo[];
  dias: string[];
  inicial: { fecha?: string; hora?: string; pacienteId?: string };
  onGuardar: (pacienteId: string, fecha: string, hora: string, primeraVez: boolean) => void;
  onNuevoPaciente: () => void;
  onCerrar: () => void;
}

export function AgregarTurnoModal({ pacientes, turnos, bloqueos, dias, inicial, onGuardar, onNuevoPaciente, onCerrar }: Props) {
  const ocupado = useMemo(() => crearOcupado(turnos, bloqueos), [turnos, bloqueos]);
  const fechaInicial = inicial.fecha ?? dias[0];
  const [busqueda, setBusqueda] = useState('');
  const [pacienteId, setPacienteId] = useState<string | null>(inicial.pacienteId ?? null);
  const [fecha, setFecha] = useState(fechaInicial);
  const [primeraVez, setPrimeraVez] = useState(false);
  const duracion = duracionDe(primeraVez);
  const horaValida = (f: string, h: string | null | undefined, d: number) => (h && cabe(ocupado, f, h, d) ? h : primerLibre(ocupado, f, d));
  const [hora, setHora] = useState<string | null>(() => horaValida(fechaInicial, inicial.hora, duracionDe(false)));
  const cambiarTipo = (esPrimera: boolean) => {
    setPrimeraVez(esPrimera);
    setHora(horaValida(fecha, hora, duracionDe(esPrimera)));
  };

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

      <div className="campo">
        <span className="etiqueta">Tipo de turno</span>
        <div className="chips">
          <button type="button" aria-pressed={!primeraVez} className={`chip ${!primeraVez ? 'chip-activo' : ''}`} onClick={() => cambiarTipo(false)}>Paciente habitual · 15 min</button>
          <button type="button" aria-pressed={primeraVez} className={`chip ${primeraVez ? 'chip-activo' : ''}`} onClick={() => cambiarTipo(true)}>Primera vez · 30 min</button>
        </div>
      </div>

      <SelectorHorario dias={dias} fecha={fecha} hora={hora} duracion={duracion} ocupado={ocupado} onCambio={(f, h) => { setFecha(f); setHora(h); }} />

      <div className="modal-pie">
        <button type="button" className="btn btn-borde" onClick={onCerrar}>Cerrar</button>
        <button type="button" className="btn btn-primario" disabled={!listo} onClick={() => listo && onGuardar(pacienteId, fecha, hora, primeraVez)}>Guardar turno</button>
      </div>
    </Modal>
  );
}
