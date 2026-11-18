import { useEffect, useState } from 'react';

const CONSULTA = '(max-width: 860px)';

export function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const alCambiar = () => setEsMovil(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return esMovil;
}
