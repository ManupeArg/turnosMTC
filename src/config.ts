// Datos del consultorio y reglas de la agenda. Cambiá acá y se actualiza toda la app.

export const MARCA = {
  consultorio: 'Centro Quiropráctico SGO',
  profesional: 'Lic. Dante Omar Gimenez',
  titulos: 'Lic. en Kinesiología · Quiropráctico',
  matricula: 'M.P. 084',
  direccion: 'Catamarca 312',
  horarios: 'Lunes a viernes de 8 a 12 y de 16 a 20 hs. Jueves solo por la tarde.',
};

/** Duración de cada turno, en minutos. */
export const DURACION_MIN = 30;

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
