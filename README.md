# Turnos · Centro Quiropráctico SGO

Agenda de turnos para escritorio y celular: login, pantalla General, Calendario, Pacientes y alta de pacientes nuevos, con la configuración del recordatorio por WhatsApp.

Hecha con React + Vite + TypeScript. Los datos van a Supabase y se publica en Vercel.

## Probarla ya (sin configurar nada)

```bash
npm install
npm run dev
```

Abrí la dirección que muestra la terminal. Sin Supabase configurado la app arranca en **modo demo**: entra con cualquier mail y contraseña, trae pacientes de ejemplo ficticios y guarda los cambios solo en ese navegador.

## Conectar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pegá el contenido de `supabase/schema.sql` y ejecutalo. Crea las tablas `pacientes`, `turnos` y `configuracion`, con acceso solo para usuarios con sesión iniciada.
3. En **Authentication > Users**, creá el usuario que va a ingresar (mail y contraseña) y marcá la opción de confirmarlo automáticamente.
4. En **Project Settings > API**, copiá la *Project URL* y la clave *anon public*.
anon:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyaXF0dGFmaWxhdGdwZXN3d2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4OTMzNTEsImV4cCI6MjExMDQ2OTM1MX0.LlNLtYF_ByTHP00OJ80gUDGAggaKSrlNXIlS7ewp39c
project url: 
https://griqttafilatgpeswwhy.supabase.co
5. Copiá `.env.example` como `.env.local` y completá:

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

6. Reiniciá `npm run dev`. El cartel de modo demo desaparece y el login pasa a ser el real.

Con la base vacía, la pantalla **Pacientes** ofrece el botón "Cargar datos de ejemplo" para tener algo que mostrar.

Ojo: los proyectos gratuitos de Supabase se pausan si pasan varios días sin uso; antes de una demo conviene entrar al panel y verificar que esté activo.

## Publicar en Vercel

1. Subí esta carpeta a un repositorio de GitHub (el `.gitignore` ya deja afuera `node_modules` y `.env.local`).
2. En Vercel, **Add New > Project**, importá el repositorio. Detecta Vite solo.
3. En **Environment Variables**, cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores.
4. Deploy.

Alternativa sin GitHub: `npx vercel` desde esta carpeta.

## Dónde tocar cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre del consultorio, profesional, matrícula, dirección | `src/config.ts` (`MARCA`) |
| Días y horarios de atención, duración de los turnos | `src/config.ts` (`ATENCION`, `DURACION_PRIMERA_VEZ`, `DURACION_HABITUAL`) y las funciones `horario_de_atencion` y `reservar_turno` de `supabase/schema.sql` |
| Colores (gris y amarillo) | `src/styles.css`, variables de `:root` |
| Lectura y escritura de datos | `src/lib/datos.ts` |
| Pantallas | `src/screens/` |

## Qué falta: WhatsApp real

Hoy los avisos se **configuran** (primer y segundo aviso, cada uno tantas horas antes del turno; si el turno se reserva con menos anticipación, ese aviso no sale) y la respuesta del paciente se **simula** con los botones "Sí, confirmo" / "No puedo ir" dentro de cada turno. Para que sea real hace falta:

- Cuenta de WhatsApp Business Platform (Meta) con una plantilla de recordatorio aprobada y botones de respuesta rápida.
- Una tarea programada (cada 15 o 30 minutos) que lea `configuracion.recordatorio_horas_antes` y `recordatorio2_horas_antes`, compare con `turnos.created_at` y envíe la plantilla a los turnos que estén a esa cantidad de horas.
- Un webhook que reciba la respuesta y actualice `turnos.estado`.

Las dos últimas se pueden hacer con funciones de Vercel o de Supabase sin cambiar el resto de la app.

## Link de reserva para pacientes

La página pública está en `/reservar` (por ejemplo `https://tu-app.vercel.app/reservar`). En la pantalla **General** está el link listo para copiar o mandar por WhatsApp.

El paciente dice si es su primera vez, completa sus datos y elige día y horario entre los libres. El turno entra al calendario como "Falta confirmación", marcado como reservado por el link y, si corresponde, "Primera vez".

- Si ya se atendió, se lo reconoce por el WhatsApp (últimos 10 dígitos) y no se duplica el paciente.
- Cada paciente puede tener hasta 2 turnos futuros reservados.
- Se puede reservar cualquier día hábil hasta un año hacia adelante (`DIAS_RESERVA` en `src/config.ts` y el tope de `reservar_turno` en `schema.sql`).
- El botón de WhatsApp de la página usa `MARCA.whatsapp` de `src/config.ts`. Mientras esté vacío abre WhatsApp sin destinatario (sirve para simular).
- La página no puede leer pacientes ni turnos: solo usa las funciones `horarios_no_disponibles` y `reservar_turno` de `supabase/schema.sql`.
- Los horarios de atención están en dos lugares: `src/config.ts` (lo que se muestra) y la función `horario_de_atencion` de `schema.sql` (lo que el servidor acepta). Si cambian, hay que cambiar los dos.

## Bloquear días y horarios

En **Calendario**, el botón "Bloquear días y horarios" activa el modo bloqueo: se toca un horario libre para bloquearlo, uno bloqueado para liberarlo, o se bloquea un día completo (también fechas más lejanas, con el selector de fecha). Lo bloqueado no se ofrece en el link ni al cargar turnos. Si el día tiene turnos cargados, avisa cuántos son y pide confirmación; esos turnos no se cancelan solos.

Las flechas arriba del calendario avanzan y retroceden de a 6 días hábiles.

## Actualizar la base

Cada vez que cambie `supabase/schema.sql`, pegalo completo de nuevo en el SQL Editor de Supabase y ejecutalo: agrega lo que falta sin borrar datos.

## Cuando un paciente avisa que no viene

El turno queda guardado como "No viene" pero deja de ocupar el lugar: ese día y horario vuelve a ofrecerse en el link y en la agenda. Si otro paciente lo toma, el calendario muestra al nuevo y una ✕ roja al lado para abrir el turno que se cayó. Un turno "No viene" no se puede volver a confirmar si el horario ya lo tomó otra persona.

## Duración de los turnos

La agenda va en bloques de 15 minutos. Un turno de primera vez dura 30 minutos y empieza en punto o y media; el de un paciente habitual dura 15 y puede empezar cada cuarto de hora. En el link público la duración sale de la respuesta a "¿Es tu primera vez?"; desde la agenda se elige al cargar el turno y se puede cambiar después. La base impide que dos turnos vigentes se superpongan.

## Recordatorios predeterminados

- Recordatorio 1: el día anterior al mediodía.
- Recordatorio 2: 3 horas antes del turno; para el primer y el segundo turno del día (los dos más tempranos cargados ese día), 1 hora antes.

Los dos se pueden cambiar en General por una cantidad fija de horas. Si un turno se reserva después del momento en que debía salir un recordatorio, ese recordatorio no se envía. Las reglas están en `src/lib/avisos.ts`.

## Exportar pacientes

En Pacientes, "Exportar" descarga un CSV (se abre con Excel) con la lista tal como se ve: respeta la búsqueda, los filtros y el orden elegidos.
