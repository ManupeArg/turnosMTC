// Datos del consultorio y reglas de la agenda. Cambiá acá y se actualiza toda la app.

export const MARCA = {
  consultorio: 'Centro Quiropráctico Santiago',
  profesional: 'Lic. Dante Omar Gimenez',
  titulos: 'Lic. en Kinesiología · Quiropráctico',
  matricula: 'M.P. 084',
  direccion: 'Catamarca 312, Sgo. del Estero',
  /** Cada elemento se muestra en un renglón. */
  horarios: ['Lunes a viernes de 8 a 12 y de 16 a 20 hs.', 'Jueves de 16 a 20 hs.'],
  /** WhatsApp del consultorio, solo números con código de país (ej: '5493851234567').
   *  Vacío = el botón abre WhatsApp sin destinatario, para simular. */
  whatsapp: '',
};

/** Link para escribirle al consultorio por WhatsApp con un mensaje ya armado. */
export const linkWhatsApp = (texto: string) =>
  `https://wa.me/${MARCA.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;

/** Ruta de la página pública donde el paciente elige su turno. */
export const RUTA_RESERVA = '/reservar';

/** Hasta cuántos días corridos hacia adelante se puede reservar desde el link (un año).
 *  Si lo cambiás, cambiá también el tope en la función reservar_turno de supabase/schema.sql. */
export const DIAS_RESERVA = 365;

/** Hasta cuántos días hábiles hacia adelante puede elegir el consultorio al cargar o mover un turno. */
export const DIAS_AGENDA = 130;

/** La agenda se divide en bloques de 15 minutos. */
export const PASO_MIN = 15;

/** Duración del turno según el tipo de paciente, en minutos.
 *  Si cambiás estos valores, cambiá también la función reservar_turno de supabase/schema.sql. */
export const DURACION_PRIMERA_VEZ = 30;
export const DURACION_HABITUAL = 15;

export const duracionDe = (primeraVez: boolean) => (primeraVez ? DURACION_PRIMERA_VEZ : DURACION_HABITUAL);

/** Franjas de atención por día de la semana (0 = domingo). Cada franja es [desde, hasta) en horas. */
export const ATENCION: Record<number, [number, number][]> = {
  0: [],
  1: [[8, 12], [16, 20]],
  2: [[8, 12], [16, 20]],
  3: [[8, 12], [16, 20]],
  4: [[16, 20]],
  5: [[8, 12], [16, 20]],
  6: [],
};

/** Cuántos días hábiles muestra el calendario (hoy incluido, si se atiende). */
export const DIAS_VISIBLES = 6;
