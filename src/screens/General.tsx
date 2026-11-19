import { useEffect, useState } from 'react';
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
  const horas = config.recordatorio_horas_antes;
  const [horasTexto, setHorasTexto] = useState(String(horas));
  useEffect(() => setHorasTexto(String(horas)), [horas]);
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
            <span className="etiqueta">Cuánto antes de cada turno se envía</span>
            <div className="chips">
              {HORAS_RECORDATORIO.map((h) => (
                <button key={h} type="button" aria-pressed={horas === h} className={`chip ${horas === h ? 'chip-activo' : ''}`} onClick={() => onGuardarConfig({ recordatorio_horas_antes: h })}>
                  {h} hs
                </button>
              ))}
            </div>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="horas-recordatorio">Otra cantidad de horas (de 1 a 168)</label>
            <input id="horas-recordatorio" className="input-hora" type="number" min={1} max={168} step={1} value={horasTexto}
              onChange={(e) => {
                setHorasTexto(e.target.value);
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= 168 && n !== horas) onGuardarConfig({ recordatorio_horas_antes: n });
              }} />
          </div>
          <p className="nota">Cada paciente recibe el mensaje {horasAntes(horas)} de su turno. En cada turno vas a ver el día y la hora exactos en que sale.</p>
        </section>
        </div>
      </div>
    </div>
  );
}
