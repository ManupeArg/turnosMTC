import { COMO_NOS_CONOCIO, SEXOS, type DatosPaciente, type Paciente } from '../types';

export interface FormPaciente {
  nombre: string;
  apellido: string;
  whatsapp: string;
  email: string;
  ciudad: string;
  edad: string;
  sexo: string;
  como_nos_conocio: string;
}

export const formVacio: FormPaciente = { nombre: '', apellido: '', whatsapp: '', email: '', ciudad: '', edad: '', sexo: '', como_nos_conocio: '' };

export const formDesde = (p: Paciente): FormPaciente => ({
  nombre: p.nombre, apellido: p.apellido, whatsapp: p.whatsapp,
  email: p.email ?? '', ciudad: p.ciudad ?? '', edad: p.edad == null ? '' : String(p.edad), sexo: p.sexo ?? '', como_nos_conocio: p.como_nos_conocio ?? '',
});

/** Valida el formulario. Devuelve los datos listos para guardar o un mensaje de error. */
export function validarPaciente(f: FormPaciente): { datos?: DatosPaciente; error?: string } {
  const nombre = f.nombre.trim(), apellido = f.apellido.trim(), whatsapp = f.whatsapp.trim(), email = f.email.trim();
  if (!nombre || !apellido || !whatsapp) return { error: 'Completá nombre, apellido y WhatsApp.' };
  if (whatsapp.replace(/\D/g, '').length < 8) return { error: 'El WhatsApp parece incompleto.' };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: 'El mail no tiene un formato válido.' };
  let edad: number | null = null;
  if (f.edad.trim()) {
    edad = Number(f.edad);
    if (!Number.isInteger(edad) || edad < 0 || edad > 120) return { error: 'Revisá la edad.' };
  }
  return { datos: { nombre, apellido, whatsapp, email: email || null, ciudad: f.ciudad.trim() || null, edad, sexo: f.sexo || null, como_nos_conocio: f.como_nos_conocio || null } };
}

interface Props {
  valor: FormPaciente;
  onCambio: (f: FormPaciente) => void;
  prefijo: string;
  /** Solo nombre, apellido y WhatsApp (paciente que ya se atendió y reserva por el link). */
  basico?: boolean;
}

export function CamposPaciente({ valor, onCambio, prefijo, basico }: Props) {
  const campo = (clave: keyof FormPaciente) => ({
    id: `${prefijo}-${clave}`,
    value: valor[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onCambio({ ...valor, [clave]: e.target.value }),
  });

  return (
    <div className="grilla-campos">
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-nombre`}>Nombre</label>
        <input type="text" autoComplete="off" {...campo('nombre')} />
      </div>
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-apellido`}>Apellido</label>
        <input type="text" autoComplete="off" {...campo('apellido')} />
      </div>
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-whatsapp`}>WhatsApp</label>
        <input type="tel" placeholder="+54 9 385 ..." autoComplete="off" {...campo('whatsapp')} />
      </div>
      {!basico && (<>
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-email`}>Mail <span className="opcional">(opcional)</span></label>
        <input type="email" autoComplete="off" {...campo('email')} />
      </div>
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-ciudad`}>Ciudad</label>
        <input type="text" autoComplete="off" {...campo('ciudad')} />
      </div>
      <div className="campo campo-doble">
        <div className="campo">
          <label className="etiqueta" htmlFor={`${prefijo}-edad`}>Edad</label>
          <input type="number" min={0} max={120} inputMode="numeric" {...campo('edad')} />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor={`${prefijo}-sexo`}>Sexo</label>
          <select {...campo('sexo')}>
            <option value="">Elegir</option>
            {SEXOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="campo">
        <label className="etiqueta" htmlFor={`${prefijo}-como_nos_conocio`}>¿Cómo nos conociste?</label>
        <select {...campo('como_nos_conocio')}>
          <option value="">Elegir</option>
          {COMO_NOS_CONOCIO.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      </>)}
    </div>
  );
}
