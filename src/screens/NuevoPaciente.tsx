import { useMemo, useState } from 'react';
import { CamposPaciente, formVacio, validarPaciente, type FormPaciente } from '../components/CamposPaciente';
import { SelectorHorario } from '../components/SelectorHorario';
import { crearOcupado, primerLibre } from '../lib/disponibilidad';
import { horasAntes } from '../lib/fechas';
import type { Bloqueo, Config, DatosPaciente, Turno } from '../types';

interface Props {
  turnos: Turno[];
  bloqueos: Bloqueo[];
  dias: string[];
  config: Config;
  onGuardar: (datos: DatosPaciente, turno: { fecha: string; hora: string } | null) => Promise<boolean>;
}

export function NuevoPaciente({ turnos, bloqueos, dias, config, onGuardar }: Props) {
  const ocupado = useMemo(() => crearOcupado(turnos, bloqueos), [turnos, bloqueos]);
  const [form, setForm] = useState<FormPaciente>(formVacio);
  const [conTurno, setConTurno] = useState(true);
  const [fecha, setFecha] = useState(dias[0]);
  const [hora, setHora] = useState<string | null>(() => primerLibre(ocupado, dias[0]));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { datos, error: problema } = validarPaciente(form);
    if (!datos) return setError(problema ?? 'Revisá los datos.');
    if (conTurno && !hora) return setError('Elegí un horario libre.');
    setError('');
    setGuardando(true);
    await onGuardar(datos, conTurno && hora ? { fecha, hora } : null);
    setGuardando(false);
  };

  return (
    <div className="pantalla pantalla-angosta">
      <header>
        <h1>Nuevo paciente</h1>
        <p className="suave">Para quienes vienen por primera vez. Los datos quedan guardados para cargar más rápido los próximos turnos.</p>
      </header>
      <form className="tarjeta formulario" onSubmit={guardar}>
        <CamposPaciente valor={form} onCambio={setForm} prefijo="nuevo" />
        <label className="check">
          <input type="checkbox" checked={conTurno} onChange={(e) => setConTurno(e.target.checked)} />
          <span>Agendar el primer turno ahora</span>
        </label>
        {conTurno && <SelectorHorario dias={dias} fecha={fecha} hora={hora} ocupado={ocupado} onCambio={(f, h) => { setFecha(f); setHora(h); }} />}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="formulario-pie">
          <button className="btn btn-primario btn-grande" disabled={guardando}>{conTurno ? 'Guardar paciente y turno' : 'Guardar paciente'}</button>
          {conTurno && <span className="suave chico">Avisos por WhatsApp: {[config.recordatorio_horas_antes, config.recordatorio2_horas_antes].filter((h): h is number => h != null).map(horasAntes).join(' y ')}.</span>}
        </div>
      </form>
    </div>
  );
}
