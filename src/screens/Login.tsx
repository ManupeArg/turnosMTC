import { useState } from 'react';
import { MARCA } from '../config';
import { ingresar, MODO_DEMO } from '../lib/datos';

export function Login({ onIngreso }: { onIngreso: (email: string) => void }) {
  const [email, setEmail] = useState(MODO_DEMO ? 'demo@centroquiropractico.com' : '');
  const [clave, setClave] = useState(MODO_DEMO ? 'demo1234' : '');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      onIngreso(await ingresar(email, clave));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar.');
      setCargando(false);
    }
  };

  return (
    <div className="login">
      <section className="login-marca">
        <div className="login-identidad">
          <img className="login-foto" src="/dante.jpg" alt={MARCA.profesional} width={120} height={160} />
          <img className="login-logo" src="/logo-blanco.png" alt="Logo DG" />
        </div>
        <div className="login-barra" aria-hidden="true" />
        <h1>{MARCA.consultorio}</h1>
        <p className="login-profesional">{MARCA.profesional}</p>
        <p>{MARCA.titulos}</p>
        <p>{MARCA.matricula}</p>
        <dl className="login-datos">
          <div><dt>Dirección</dt><dd>{MARCA.direccion}</dd></div>
          <div><dt>Atención</dt><dd>{MARCA.horarios}</dd></div>
        </dl>
      </section>
      <form className="login-form" onSubmit={enviar}>
        <h2>Ingresá a la agenda</h2>
        {MODO_DEMO && <p className="nota">Modo demo: todavía no hay Supabase configurado, así que entra con cualquier mail y contraseña.</p>}
        <div className="campo">
          <label className="etiqueta" htmlFor="login-mail">Mail</label>
          <input id="login-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="login-clave">Contraseña</label>
          <input id="login-clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primario btn-grande" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
