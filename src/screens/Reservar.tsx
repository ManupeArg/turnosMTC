// Página pública: el paciente entra con el link, dice si es su primera vez y elige día y horario.
import { useEffect, useMemo, useState } from 'react';
import { CamposPaciente, formVacio, validarPaciente, type FormPaciente } from '../components/CamposPaciente';
import { SelectorHorario } from '../components/SelectorHorario';
import { DIAS_RESERVA, duracionDe, linkWhatsApp, MARCA } from '../config';
import * as api from '../lib/datos';
import { cabe, crearOcupado, primerLibre, tieneLugar } from '../lib/disponibilidad';
import { diaLargo, diasHabilesHasta, horaLinda, hoyIso, sumarDias } from '../lib/fechas';
import type { NoDisponible } from '../types';

export function Reservar() {
  const diasPosibles = useMemo(() => diasHabilesHasta(sumarDias(hoyIso(), DIAS_RESERVA)), []);
  const consulta = linkWhatsApp(`Hola, quiero consultar por un turno en ${MARCA.consultorio}.`);
  const [noDisponibles, setNoDisponibles] = useState<NoDisponible[] | null>(null);
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormPaciente>(formVacio);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ nombre: string; fecha: string; hora: string } | null>(null);

  const ocupado = useMemo(() => {
    const lista = noDisponibles ?? [];
    return crearOcupado(lista.filter((n): n is { fecha: string; hora: string; duracion?: number } => n.hora !== null), lista.filter((n) => n.hora === null), { sinPasados: true });
  }, [noDisponibles]);
  /** 30 minutos la primera vez, 15 si ya es paciente: cambia qué horarios se ofrecen. */
  const duracion = duracionDe(primeraVez ?? true);
  const dias = useMemo(() => diasPosibles.filter((d) => tieneLugar(ocupado, d, duracion)), [diasPosibles, ocupado, duracion]);

  const cargar = async () => {
    try {
      setNoDisponibles(await api.horariosNoDisponibles(hoyIso(), diasPosibles[diasPosibles.length - 1]));
    } catch {
      setError('No pudimos cargar los horarios. Probá de nuevo en un rato.');
      setNoDisponibles([]);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Al tener la disponibilidad (o si cambia), se asegura de que el día y horario elegidos sigan libres.
  useEffect(() => {
    if (!noDisponibles || dias.length === 0) return;
    const f = fecha && dias.includes(fecha) ? fecha : dias[0];
    const h = hora && cabe(ocupado, f, hora, duracion) ? hora : primerLibre(ocupado, f, duracion);
    if (f !== fecha) setFecha(f);
    if (h !== hora) setHora(h);
  }, [noDisponibles, dias, duracion]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (primeraVez === null) return setError('Contanos si es tu primera vez.');
    const { datos, error: problema } = validarPaciente(form);
    if (!datos) return setError(problema ?? 'Revisá tus datos.');
    if (!fecha || !hora) return setError('Elegí un día y un horario.');
    setError('');
    setEnviando(true);
    try {
      const resultado = await api.reservarTurno({ ...datos, fecha, hora, primera_vez: primeraVez });
      if (resultado === 'ok') setListo({ nombre: datos.nombre, fecha, hora });
      else if (resultado === 'ocupado') { setError('Ese horario se acaba de ocupar. Elegí otro, por favor.'); await cargar(); }
      else if (resultado === 'limite') setError('Ya tenés turnos reservados. Si necesitás cambiarlos, escribinos por WhatsApp.');
      else setError('No pudimos tomar el turno. Revisá tus datos y el horario elegido.');
    } catch {
      setError('No pudimos tomar el turno. Probá de nuevo en un rato.');
    }
    setEnviando(false);
  };

  return (
    <div className="reserva">
      <header className="reserva-cabecera">
        <img className="reserva-foto" src="/dante.jpg" alt={MARCA.profesional} width={96} height={128} />
        <div className="reserva-quien">
          <img className="reserva-logo" src="/logo-blanco.png" alt="" />
          <p className="reserva-consultorio">{MARCA.consultorio}</p>
          <p className="reserva-profesional">{MARCA.profesional}</p>
          <p>{MARCA.titulos} · {MARCA.matricula}</p>
          <p>{MARCA.direccion}</p>
        </div>
      </header>

      <main className="reserva-cuerpo">
        {listo ? (
          <section className="tarjeta" role="status">
            <h1>¡Listo, {listo.nombre}!</h1>
            <p className="reserva-turno">Tu turno es el <strong>{diaLargo(listo.fecha)} a las {horaLinda(listo.hora)}</strong>.</p>
            <p>Te esperamos en {MARCA.direccion}. Te vamos a mandar un recordatorio por WhatsApp para que confirmes.</p>
          </section>
        ) : (
          <form className="tarjeta formulario" onSubmit={confirmar}>
            <h1>Reservá tu turno</h1>

            <div className="campo">
              <span className="etiqueta">¿Es tu primera vez en el consultorio?</span>
              <div className="chips chips-eleccion">
                <button type="button" aria-pressed={primeraVez === true} className={`chip ${primeraVez === true ? 'chip-activo' : ''}`} onClick={() => setPrimeraVez(true)}>Sí, es mi primera vez</button>
                <button type="button" aria-pressed={primeraVez === false} className={`chip ${primeraVez === false ? 'chip-activo' : ''}`} onClick={() => setPrimeraVez(false)}>No, ya soy paciente</button>
              </div>
            </div>

            {primeraVez !== null && (
              <>
                <CamposPaciente valor={form} onCambio={setForm} prefijo="reserva" basico={!primeraVez} />
                {!primeraVez && <p className="suave chico">Usá el mismo WhatsApp que dejaste en el consultorio, así te encontramos.</p>}

                {noDisponibles === null ? (
                  <p className="suave">Cargando horarios…</p>
                ) : dias.length === 0 || !fecha ? (
                  <p className="nota">Por ahora no hay horarios libres. Escribinos por WhatsApp y te buscamos un lugar.</p>
                ) : (
                  <SelectorHorario dias={dias} fecha={fecha} hora={hora} duracion={duracion} ocupado={ocupado} soloLibres onCambio={(f, h) => { setFecha(f); setHora(h); }} />
                )}

                {error && <p className="error" role="alert">{error}</p>}
                <button className="btn btn-primario btn-grande" disabled={enviando || !fecha || !hora}>
                  {enviando ? 'Reservando…' : fecha && hora ? `Confirmar: ${diaLargo(fecha)} a las ${horaLinda(hora)}` : 'Confirmar turno'}
                </button>
              </>
            )}
            {primeraVez === null && error && <p className="error" role="alert">{error}</p>}
          </form>
        )}
        <a className="btn btn-borde btn-link btn-whatsapp" href={consulta} target="_blank" rel="noreferrer">¿Dudas? Escribinos por WhatsApp</a>
        <p className="suave chico reserva-pie">{MARCA.horarios.map((h) => <span key={h} className="renglon">{h}</span>)}</p>
      </main>
    </div>
  );
}
