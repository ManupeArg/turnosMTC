import { useState } from 'react';
import { diaLargo, horaLinda } from '../lib/fechas';
import type { Datos, Paciente } from '../types';

interface Props {
  datos: Datos;
  onEditar: (p: Paciente) => void;
  onAgendar: (p: Paciente) => void;
  onNuevo: () => void;
  onCargarEjemplos: () => void;
}

export function Pacientes({ datos, onEditar, onAgendar, onNuevo, onCargarEjemplos }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase();
  const lista = datos.pacientes
    .filter((p) => `${p.nombre} ${p.apellido} ${p.ciudad ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  const proximo = (id: string) => {
    const t = datos.turnos.filter((x) => x.paciente_id === id && x.estado !== 'no_viene').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
    return t ? `Próximo turno: ${diaLargo(t.fecha)} · ${horaLinda(t.hora)}` : 'Sin turnos próximos';
  };
  const detalle = (p: Paciente) => [p.ciudad, p.edad != null ? `${p.edad} años` : null, p.sexo, p.como_nos_conocio ? `Nos conoció por: ${p.como_nos_conocio.toLowerCase()}` : null].filter(Boolean).join(' · ');
  const total = datos.pacientes.length;

  return (
    <div className="pantalla">
      <header className="cabecera-pantalla">
        <div>
          <h1>Pacientes</h1>
          <p className="suave">{total === 1 ? '1 paciente guardado' : `${total} pacientes guardados`}</p>
        </div>
        <div className="chips">
          <input className="buscador" type="search" aria-label="Buscar paciente" placeholder="Buscá por nombre, apellido o ciudad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <button type="button" className="btn btn-primario" onClick={onNuevo}>+ Nuevo paciente</button>
        </div>
      </header>

      {total === 0 ? (
        <section className="tarjeta vacio">
          <p>Todavía no hay pacientes cargados.</p>
          <div className="chips">
            <button type="button" className="btn btn-primario" onClick={onNuevo}>Cargar el primero</button>
            <button type="button" className="btn btn-borde" onClick={onCargarEjemplos}>Cargar datos de ejemplo</button>
          </div>
        </section>
      ) : (
        <section className="tarjeta sin-relleno">
          {lista.length === 0 && <p className="suave relleno">No hay pacientes que coincidan.</p>}
          {lista.map((p) => (
            <div key={p.id} className="fila-paciente">
              <div className="pac-principal">
                <strong>{p.apellido}, {p.nombre}</strong>
                <span className="suave chico">{detalle(p) || 'Sin datos adicionales'}</span>
              </div>
              <div className="pac-contacto">
                <span>{p.whatsapp}</span>
                {p.email && <span className="suave chico">{p.email}</span>}
              </div>
              <div className="pac-turno suave chico">{proximo(p.id)}</div>
              <div className="chips">
                <button type="button" className="btn btn-borde" onClick={() => onEditar(p)} aria-label={`Editar a ${p.nombre} ${p.apellido}`}>Editar</button>
                <button type="button" className="btn btn-oscuro" onClick={() => onAgendar(p)} aria-label={`Agendar turno a ${p.nombre} ${p.apellido}`}>Agendar turno</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
