import { useMemo, useState } from 'react';
import { diaLargo, horaLinda, hoyIso } from '../lib/fechas';
import { COMO_NOS_CONOCIO, type Datos, type Paciente } from '../types';

interface Props {
  datos: Datos;
  onEditar: (p: Paciente) => void;
  onAgendar: (p: Paciente) => void;
  onNuevo: () => void;
  onCargarEjemplos: () => void;
}

type Orden = 'apellido' | 'nombre' | 'recientes' | 'proximo' | 'ciudad' | 'edad';

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: 'apellido', texto: 'Apellido (A a Z)' },
  { valor: 'nombre', texto: 'Nombre (A a Z)' },
  { valor: 'recientes', texto: 'Cargados más recientemente' },
  { valor: 'proximo', texto: 'Próximo turno' },
  { valor: 'ciudad', texto: 'Ciudad' },
  { valor: 'edad', texto: 'Edad (menor a mayor)' },
];

/** Arma un CSV que Excel abre bien en español: separado por punto y coma y con marca UTF-8. */
const aCsv = (filas: (string | number | null)[][]) =>
  '﻿' + filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

export function Pacientes({ datos, onEditar, onAgendar, onNuevo, onCargarEjemplos }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('apellido');
  const [origen, setOrigen] = useState('');
  const [ciudad, setCiudad] = useState('');

  const proximoTurno = (id: string) =>
    datos.turnos.filter((x) => x.paciente_id === id && x.estado !== 'no_viene').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
  const textoProximo = (id: string) => {
    const t = proximoTurno(id);
    return t ? `${diaLargo(t.fecha)} · ${horaLinda(t.hora)}` : '';
  };

  const ciudades = useMemo(() => [...new Set(datos.pacientes.map((p) => p.ciudad).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)), [datos.pacientes]);

  const q = busqueda.trim().toLowerCase();
  const texto = (a: string | null, b: string | null) => (a ?? '￿').localeCompare(b ?? '￿');
  const comparar: Record<Orden, (a: Paciente, b: Paciente) => number> = {
    apellido: (a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre) || a.apellido.localeCompare(b.apellido),
    recientes: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    proximo: (a, b) => {
      const ta = proximoTurno(a.id), tb = proximoTurno(b.id);
      return texto(ta ? ta.fecha + ta.hora : null, tb ? tb.fecha + tb.hora : null);
    },
    ciudad: (a, b) => texto(a.ciudad, b.ciudad) || a.apellido.localeCompare(b.apellido),
    edad: (a, b) => (a.edad ?? 999) - (b.edad ?? 999),
  };
  const lista = datos.pacientes
    .filter((p) => `${p.nombre} ${p.apellido} ${p.ciudad ?? ''}`.toLowerCase().includes(q))
    .filter((p) => !origen || (origen === 'sin-dato' ? !p.como_nos_conocio : p.como_nos_conocio === origen))
    .filter((p) => !ciudad || p.ciudad === ciudad)
    .sort(comparar[orden]);

  const detalle = (p: Paciente) => [p.ciudad, p.edad != null ? `${p.edad} años` : null, p.sexo, p.como_nos_conocio ? `Nos conoció por: ${p.como_nos_conocio.toLowerCase()}` : null].filter(Boolean).join(' · ');
  const total = datos.pacientes.length;
  const hayFiltros = !!(q || origen || ciudad);

  /** Descarga la lista tal como se ve (con los filtros y el orden elegidos). */
  const exportar = () => {
    const filas = [
      ['Apellido', 'Nombre', 'WhatsApp', 'Mail', 'Ciudad', 'Edad', 'Sexo', 'Cómo nos conoció', 'Próximo turno', 'Fecha de alta'],
      ...lista.map((p) => [p.apellido, p.nombre, p.whatsapp, p.email, p.ciudad, p.edad, p.sexo, p.como_nos_conocio, textoProximo(p.id), (p.created_at ?? '').slice(0, 10)]),
    ];
    const url = URL.createObjectURL(new Blob([aCsv(filas)], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `pacientes-${hoyIso()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pantalla">
      <header className="cabecera-pantalla">
        <div>
          <h1>Pacientes</h1>
          <p className="suave">
            {total === 1 ? '1 paciente guardado' : `${total} pacientes guardados`}
            {hayFiltros && ` · mostrando ${lista.length}`}
          </p>
        </div>
        <div className="chips">
          <button type="button" className="btn btn-primario" onClick={onNuevo}>+ Nuevo paciente</button>
          <button type="button" className="btn btn-borde" onClick={exportar} disabled={lista.length === 0}>Exportar</button>
        </div>
      </header>

      {total > 0 && (
        <section className="tarjeta filtros">
          <div className="campo">
            <label className="etiqueta" htmlFor="pac-buscar">Buscar</label>
            <input id="pac-buscar" type="search" placeholder="Nombre, apellido o ciudad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="pac-orden">Ordenar por</label>
            <select id="pac-orden" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
              {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="pac-origen">Cómo nos conoció</label>
            <select id="pac-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Todos</option>
              {COMO_NOS_CONOCIO.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="sin-dato">Sin dato</option>
            </select>
          </div>
          <div className="campo">
            <label className="etiqueta" htmlFor="pac-ciudad">Ciudad</label>
            <select id="pac-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
              <option value="">Todas</option>
              {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </section>
      )}

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
              <div className="pac-turno suave chico">{textoProximo(p.id) ? `Próximo turno: ${textoProximo(p.id)}` : 'Sin turnos próximos'}</div>
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
