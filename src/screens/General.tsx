import { useState } from 'react';
import { MARCA, RUTA_RESERVA } from '../config';
import { OPCIONES_AVISO1, OPCIONES_AVISO2 } from '../lib/avisos';
import { ocupaLugar } from '../lib/disponibilidad';
import { atiende, esManana, fechaCompleta, horaLinda, hoyIso } from '../lib/fechas';
import { ESTADOS, ORDEN_ESTADOS, type Config, type Datos, type Turno } from '../types';

interface Props {
  datos: Datos;
  onAbrirTurno: (id: string) => void;
  onGuardarConfig: (config: Config) => void;
}

export function General({ datos, onAbrirTurno, onGuardarConfig }: Props) {
  const hoy = hoyIso();
  const deHoy = datos.turnos.filter((t) => t.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const n = deHoy.filter(ocupaLugar).length;
  const { config } = datos;
  const titulo = !atiende(hoy) ? 'Hoy el consultorio no atiende' : n === 0 ? 'Hoy no tenés turnos' : n === 1 ? 'Hoy tenés 1 turno' : `Hoy tenés ${n} turnos`;
  const paciente = (id: string) => datos.pacientes.find((p) => p.id === id);
  const franjas = [
    { nombre: 'Por la mañana', turnos: deHoy.filter((t) => esManana(t.hora)) },
    { nombre: 'Por la tarde', turnos: deHoy.filter((t) => !esManana(t.hora)) },
  ];
  const cuantos = (lista: Turno[]) => {
    const c = lista.filter(ocupaLugar).length;
    return c === 1 ? '1 turno' : `${c} turnos`;
  };
  const [copiado, setCopiado] = useState(false);
  const link = `${window.location.origin}${RUTA_RESERVA}`;
  const mensaje = `Hola, podés reservar tu turno en ${MARCA.consultorio} desde este link: ${link}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="pantalla">
      <header>
        <p className="suave">{fechaCompleta(hoy)}</p>
        <h1 className="titulo-grande">{titulo}</h1>
      </header>

      <div className="resumen">
        {ORDEN_ESTADOS.map((e) => (
          <div key={e} className={`resumen-item ${ESTADOS[e].clase}`}>
            <span className="resumen-numero">{deHoy.filter((t) => t.estado === e).length}</span>
            <span>{ESTADOS[e].marca} {ESTADOS[e].nombre}</span>
          </div>
        ))}
      </div>

      <div className="dos-columnas">
        <section className="tarjeta col-ancha">
          <h2>Turnos de hoy</h2>
          {deHoy.length === 0 && <p className="suave">No hay turnos cargados para hoy.</p>}
          {deHoy.length > 0 && franjas.map((f) => (
            <div key={f.nombre} className="franja-turnos">
              <h3>{f.nombre} <span className="suave">· {cuantos(f.turnos)}</span></h3>
              {f.turnos.length === 0 && <p className="suave chico">Sin turnos.</p>}
              <div className="lista">
                {f.turnos.map((t) => {
                  const p = paciente(t.paciente_id);
                  return (
                    <button key={t.id} type="button" className="fila-turno" onClick={() => onAbrirTurno(t.id)}>
                      <span className="fila-hora">{horaLinda(t.hora)}</span>
                      <span className="fila-nombre">
                        {p ? `${p.nombre} ${p.apellido}` : 'Paciente'}
                        <span className="suave chico"> · {t.duracion} min</span>
                        {t.primera_vez && <span className="pastilla pastilla-amarilla pastilla-junto">Primera vez</span>}
                      </span>
                      <span className={`pastilla ${ESTADOS[t.estado].clase}`}>{ESTADOS[t.estado].marca} {ESTADOS[t.estado].nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="col-angosta columna">
        <section className="tarjeta">
          <h2>Link para que el paciente reserve</h2>
          <p className="suave">Mandalo por WhatsApp: el paciente elige día y horario entre los que están libres y el turno aparece en tu calendario.</p>
          <input className="input-link" type="text" readOnly aria-label="Link de reserva" value={link} onFocus={(e) => e.target.select()} />
          <div className="chips">
            <button type="button" className="btn btn-primario" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
            <a className="btn btn-borde btn-link" href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>
            <a className="btn btn-borde btn-link" href={RUTA_RESERVA} target="_blank" rel="noreferrer">Ver la página</a>
          </div>
        </section>
        <section className="tarjeta">
          <h2>Recordatorios por WhatsApp</h2>
          <p className="suave">Se mandan solos a cada paciente. Su respuesta actualiza el estado del turno.</p>
          <div className="campo">
            <label className="etiqueta" htmlFor="aviso-1">Recordatorio 1</label>
            <select id="aviso-1" value={config.aviso1} onChange={(e) => onGuardarConfig({ ...config, aviso1: e.target.value })}>
              {OPCIONES_AVISO1.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="aviso-2">Recordatorio 2</label>
            <select id="aviso-2" value={config.aviso2} onChange={(e) => onGuardarConfig({ ...config, aviso2: e.target.value })}>
              {OPCIONES_AVISO2.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </div>
          <p className="nota">Si un turno se reserva después del momento en que debía salir un recordatorio, ese recordatorio ya no se envía.</p>
        </section>
        </div>
      </div>
    </div>
  );
}
