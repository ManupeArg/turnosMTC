import { useEffect, type ReactNode } from 'react';

export function Modal({ titulo, subtitulo, onCerrar, children }: { titulo: string; subtitulo?: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p className="suave">{subtitulo}</p>}
          </div>
          <button className="btn btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
