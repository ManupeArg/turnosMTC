import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RUTA_RESERVA } from './config';
import { Reservar } from './screens/Reservar';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname.startsWith(RUTA_RESERVA) ? <Reservar /> : <App />}
  </React.StrictMode>,
);
