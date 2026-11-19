import { useEffect, useState } from 'react';

/** true si la ventana mide hasta ese ancho (por defecto 860 px, donde el menú pasa abajo). */
export function useEsMovil(ancho = 860) {
  const CONSULTA = `(max-width: ${ancho}px)`;
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const alCambiar = () => setEsMovil(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, [CONSULTA]);
  return esMovil;
}
