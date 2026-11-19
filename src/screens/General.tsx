import { useState } from 'react';
import { MARCA, RUTA_RESERVA } from '../config';
import { atiende, fechaCompleta, horaLinda, horasAntes, hoyIso } from '../lib/fechas';
import { ESTADOS, HORAS_RECORDATORIO, ORDEN_ESTADOS, type Config, type Datos } from '../types';

interface Props {
  datos: Datos;
  onAbrirTurno: (id: string) => void;
  onGuardarConfig: (config: Config) => void;
}

export function General({ datos, onAbrirTurno, onGuardarConfig }: Props) {
  const hoy = hoyIso();
  const deHoy = datos.turnos.filter((t) => t.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const n = deHoy.length;
  const { config } = datos;
  const titulo = !atiende(hoy) ? 'Hoy el consultorio no atiende' : n === 0 ? 'Hoy no tenés turnos' : n === 1 ? 'Hoy tenés 1 turno' : `Hoy tenés ${n} turnos`;
  const paciente = (id: string) => datos.pacientes.find((p) => p.id === id);
  const primero = config.recordatorio_horas_antes;
  const segundo = config.recordatorio2_horas_antes;
  /** Las opciones fijas, más el valor guardado si era otro (por ejemplo de una versión anterior). */
  const opciones = (actual: number | null) => (actual != null && !HORAS_RECORDATORIO.includes(actual) ? [...HORAS_RECORDATORIO, actual].sort((a, b) => a - b) : HORAS_RECORDATORIO);
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
          {n === 0 && <p className="suave">No hay turnos cargados para hoy.</p>}
          <div className="lista">
            {deHoy.map((t) => {
              const p = paciente(t.paciente_id);
              return (
                <button key={t.id} type="button" className="fila-turno" onClick={() => onAbrirTurno(t.id)}>
                  <span className="fila-hora">{horaLinda(t.hora)}</span>
                  <span className="fila-nombre">{p ? `${p.nombre} ${p.apellido}` : 'Paciente'}{t.primera_vez && <span className="pastilla pastilla-amarilla pastilla-junto">Primera vez</span>}</span>
                  <span className={`pastilla ${ESTADOS[t.estado].clase}`}>{ESTADOS[t.estado].marca} {ESTADOS[t.estado].nombre}</span>
                </button>
              );
            })}
          </div>
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
          <h2>Recordatorio por WhatsApp</h2>
          <p className="suave">Se manda solo a cada paciente. Su respuesta actualiza el estado del turno.</p>
          <div className="campo">
            <label className="etiqueta" htmlFor="aviso-1">Primer aviso</label>
            <select id="aviso-1" value={primero} onChange={(e) => onGuardarConfig({ ...config, recordatorio_horas_antes: Number(e.target.value) })}>
              {opciones(primero).map((h) => <option key={h} value={h}>{horasAntes(h)}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="aviso-2">Segundo aviso</label>
            <select id="aviso-2" value={segundo ?? ''} onChange={(e) => onGuardarConfig({ ...config, recordatorio2_horas_antes: e.target.value ? Number(e.target.value) : null })}>
              <option value="">No enviar segundo aviso</option>
              {opciones(segundo).map((h) => <option key={h} value={h}>{horasAntes(h)}</option>)}
            </select>
          </div>
          {segundo != null && segundo >= primero && <p className="error">El segundo aviso debería salir más cerca del turno que el primero. Elegí menos horas.</p>}
          <p className="nota">Si un turno se reserva con menos anticipación que un aviso, ese aviso ya no se envía. Por ejemplo: con un aviso de 24 horas antes y un turno sacado 10 horas antes, ese aviso no sale.</p>
        </section>
        </div>
      </div>
    </div>
  );
}
