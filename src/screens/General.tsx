import { useState } from 'react';
import { MARCA, RUTA_RESERVA } from '../config';
import { atiende, fechaCompleta, horaLinda, hoyIso } from '../lib/fechas';
import { ESTADOS, ORDEN_ESTADOS, type Config, type Datos } from '../types';

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
            <span className="etiqueta">Cuándo se envía</span>
            <div className="chips">
              <button type="button" aria-pressed={config.recordatorio_cuando === 'dia_anterior'} className={`chip ${config.recordatorio_cuando === 'dia_anterior' ? 'chip-activo' : ''}`}
                onClick={() => onGuardarConfig({ recordatorio_cuando: 'dia_anterior', recordatorio_hora: '18:00' })}>El día anterior</button>
              <button type="button" aria-pressed={config.recordatorio_cuando === 'mismo_dia'} className={`chip ${config.recordatorio_cuando === 'mismo_dia' ? 'chip-activo' : ''}`}
                onClick={() => onGuardarConfig({ recordatorio_cuando: 'mismo_dia', recordatorio_hora: '07:00' })}>El mismo día</button>
            </div>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="hora-recordatorio">Hora de envío</label>
            <input id="hora-recordatorio" className="input-hora" type="time" value={config.recordatorio_hora}
              onChange={(e) => e.target.value && onGuardarConfig({ ...config, recordatorio_hora: e.target.value })} />
          </div>
          <p className="nota">
            {config.recordatorio_cuando === 'dia_anterior'
              ? `Los pacientes con turno mañana reciben el mensaje hoy a las ${config.recordatorio_hora}.`
              : `Cada paciente recibe el mensaje el mismo día de su turno, a las ${config.recordatorio_hora}.`}
          </p>
        </section>
        </div>
      </div>
    </div>
  );
}
