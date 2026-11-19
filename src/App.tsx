import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgregarTurnoModal } from './components/AgregarTurnoModal';
import { CamposPaciente, formDesde, validarPaciente, type FormPaciente } from './components/CamposPaciente';
import { Modal } from './components/Modal';
import { TurnoModal } from './components/TurnoModal';
import { DIAS_AGENDA, MARCA } from './config';
import * as api from './lib/datos';
import { avisosDe } from './lib/avisos';
import { diaLargo, horaLinda, proximosDiasHabiles } from './lib/fechas';
import { Calendario } from './screens/Calendario';
import { General } from './screens/General';
import { Login } from './screens/Login';
import { NuevoPaciente } from './screens/NuevoPaciente';
import { Pacientes } from './screens/Pacientes';
import type { Datos, Paciente } from './types';

type Pantalla = 'general' | 'calendario' | 'pacientes' | 'nuevo';

const SECCIONES: { id: Pantalla; nombre: string; corto: string; icono: string }[] = [
  { id: 'general', nombre: 'General', corto: 'General', icono: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { id: 'calendario', nombre: 'Calendario', corto: 'Calendario', icono: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4' },
  { id: 'pacientes', nombre: 'Pacientes', corto: 'Pacientes', icono: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M18 15c3 .6 4 2.8 4 6' },
  { id: 'nuevo', nombre: 'Nuevo paciente', corto: 'Nuevo', icono: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6' },
];

export default function App() {
  const [sesion, setSesion] = useState<string | null | undefined>(undefined);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>('general');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [turnoId, setTurnoId] = useState<string | null>(null);
  const [agregar, setAgregar] = useState<{ fecha?: string; hora?: string; pacienteId?: string } | null>(null);
  const [editando, setEditando] = useState<{ paciente: Paciente; form: FormPaciente; error: string } | null>(null);

  const diasElegibles = useMemo(() => proximosDiasHabiles(DIAS_AGENDA), []);

  const avisarError = (e: unknown) => setAviso({ texto: e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.', error: true });

  const recargar = useCallback(async () => {
    try {
      setDatos(await api.cargarTodo());
    } catch (e) {
      avisarError(e);
    }
  }, []);

  useEffect(() => {
    api.obtenerSesion().then(setSesion).catch(() => setSesion(null));
  }, []);

  useEffect(() => {
    if (sesion) recargar();
  }, [sesion, recargar]);

  /** Ejecuta un cambio, recarga los datos y muestra el resultado. */
  const ejecutar = async (cambio: () => Promise<unknown>, mensaje?: string) => {
    try {
      await cambio();
      setDatos(await api.cargarTodo());
      setAviso(mensaje ? { texto: mensaje } : null);
      return true;
    } catch (e) {
      avisarError(e);
      return false;
    }
  };

  const ir = (p: Pantalla) => {
    setPantalla(p);
    setAviso(null);
    setAgregar(null);
    setTurnoId(null);
  };

  const cerrarSesion = async () => {
    await api.salir();
    setSesion(null);
    setDatos(null);
    ir('general');
  };

  if (sesion === undefined) return <div className="cargando">Cargando…</div>;
  if (!sesion) return <Login onIngreso={setSesion} />;

  const turno = datos?.turnos.find((t) => t.id === turnoId) ?? null;
  const pacienteDelTurno = turno ? datos?.pacientes.find((p) => p.id === turno.paciente_id) ?? null : null;
  /** Qué recordatorios por WhatsApp llegan a salir para un turno que se carga ahora. */
  const textoAvisos = (fecha: string, hora: string) => {
    if (!datos) return '';
    const salen = avisosDe({ fecha, hora, estado: 'pendiente', created_at: new Date().toISOString() }, datos.turnos, datos.config).filter((a) => a.seEnvia);
    if (salen.length === 0) return ' Se reservó con poca anticipación: no sale ningún recordatorio por WhatsApp.';
    return ` Recordatorio por WhatsApp: ${salen.map((a) => a.cuando).join(' y ')}.`;
  };
  const nombreDe = (id: string) => {
    const p = datos?.pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : 'Paciente';
  };

  return (
    <div className="app">
      <nav className="menu" aria-label="Secciones">
        <div className="menu-marca">
          <img className="menu-logo" src="/logo-blanco.png" alt="Logo DG" />
          <strong>{MARCA.consultorio}</strong>
          <span>{MARCA.profesional}</span>
        </div>
        <div className="menu-items">
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" aria-pressed={pantalla === s.id} aria-label={s.nombre} className={`menu-item ${pantalla === s.id ? 'menu-activo' : ''}`} onClick={() => ir(s.id)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icono} /></svg>
              <span className="menu-largo">{s.nombre}</span>
              <span className="menu-corto">{s.corto}</span>
            </button>
          ))}
        </div>
        <button type="button" className="menu-salir" onClick={cerrarSesion}>Salir</button>
      </nav>

      <main className="contenido">
        {api.MODO_DEMO && <p className="nota nota-demo">Modo demo: los datos se guardan solo en este navegador. Configurá Supabase (ver README) para usar la base real.</p>}
        {aviso && (
          <div className={`aviso ${aviso.error ? 'aviso-error' : ''}`} role={aviso.error ? 'alert' : 'status'}>
            <span>{aviso.texto}</span>
            <button type="button" className="btn btn-claro" onClick={() => setAviso(null)}>Cerrar</button>
          </div>
        )}

        {!datos ? (
          <div className="cargando">Cargando la agenda…</div>
        ) : pantalla === 'general' ? (
          <General datos={datos} onAbrirTurno={setTurnoId} onGuardarConfig={(c) => ejecutar(() => api.guardarConfig(c))} />
        ) : pantalla === 'calendario' ? (
          <Calendario datos={datos} onAbrirTurno={setTurnoId} onAgregar={(fecha, hora) => setAgregar({ fecha, hora })}
            onBloquear={(fecha, hora) => ejecutar(() => api.crearBloqueo(fecha, hora))} onDesbloquear={(id) => ejecutar(() => api.quitarBloqueo(id))} />
        ) : pantalla === 'pacientes' ? (
          <Pacientes
            datos={datos}
            onEditar={(p) => setEditando({ paciente: p, form: formDesde(p), error: '' })}
            onAgendar={(p) => setAgregar({ pacienteId: p.id })}
            onNuevo={() => ir('nuevo')}
            onCargarEjemplos={() => ejecutar(() => api.cargarEjemplos(), 'Datos de ejemplo cargados.')}
          />
        ) : (
          <NuevoPaciente
            turnos={datos.turnos} bloqueos={datos.bloqueos} dias={diasElegibles}
            onGuardar={async (nuevo, t) => {
              const ok = await ejecutar(async () => {
                const p = await api.guardarPaciente(nuevo);
                if (t) await api.crearTurno({ paciente_id: p.id, ...t, primera_vez: true });
              }, t
                ? `${nuevo.nombre} ${nuevo.apellido} quedó guardado, con turno el ${diaLargo(t.fecha)} a las ${horaLinda(t.hora)}.${textoAvisos(t.fecha, t.hora)}`
                : `${nuevo.nombre} ${nuevo.apellido} quedó guardado.`);
              if (ok) setPantalla(t ? 'calendario' : 'pacientes');
              return ok;
            }}
          />
        )}
        <button type="button" className="btn-enlace salir-movil" onClick={cerrarSesion}>Salir de la agenda</button>
      </main>

      {datos && turno && pacienteDelTurno && (
        <TurnoModal
          turno={turno} paciente={pacienteDelTurno} turnos={datos.turnos} bloqueos={datos.bloqueos} dias={diasElegibles} config={datos.config}
          onCambiar={(cambios) => ejecutar(() => api.actualizarTurno(turno.id, cambios))}
          onCancelar={async () => {
            const texto = `Turno cancelado: ${nombreDe(turno.paciente_id)}, ${diaLargo(turno.fecha)} a las ${horaLinda(turno.hora)}.`;
            setTurnoId(null);
            await ejecutar(() => api.cancelarTurno(turno.id), texto);
          }}
          onCerrar={() => setTurnoId(null)}
        />
      )}

      {datos && agregar && (
        <AgregarTurnoModal
          pacientes={datos.pacientes} turnos={datos.turnos} bloqueos={datos.bloqueos} dias={diasElegibles} inicial={agregar}
          onGuardar={async (pacienteId, fecha, hora, primeraVez) => {
            const ok = await ejecutar(() => api.crearTurno({ paciente_id: pacienteId, fecha, hora, primera_vez: primeraVez }),
              `Turno guardado: ${nombreDe(pacienteId)}, ${diaLargo(fecha)} a las ${horaLinda(hora)}.${textoAvisos(fecha, hora)}`);
            if (ok) setAgregar(null);
          }}
          onNuevoPaciente={() => ir('nuevo')}
          onCerrar={() => setAgregar(null)}
        />
      )}

      {editando && (
        <Modal titulo="Editar paciente" onCerrar={() => setEditando(null)}>
          <CamposPaciente valor={editando.form} onCambio={(form) => setEditando({ ...editando, form })} prefijo="editar" />
          {editando.error && <p className="error" role="alert">{editando.error}</p>}
          <div className="modal-pie">
            <button type="button" className="btn btn-borde" onClick={() => setEditando(null)}>Cerrar</button>
            <button type="button" className="btn btn-primario" onClick={async () => {
              const { datos: validos, error } = validarPaciente(editando.form);
              if (!validos) return setEditando({ ...editando, error: error ?? 'Revisá los datos.' });
              const ok = await ejecutar(() => api.guardarPaciente(validos, editando.paciente.id), `Datos de ${validos.nombre} ${validos.apellido} actualizados.`);
              if (ok) setEditando(null);
            }}>Guardar cambios</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
