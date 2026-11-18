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
| Días y horarios de atención, duración del turno | `src/config.ts` (`ATENCION`, `DURACION_MIN`) |
| Colores (gris y amarillo) | `src/styles.css`, variables de `:root` |
| Lectura y escritura de datos | `src/lib/datos.ts` |
| Pantallas | `src/screens/` |

## Qué falta: WhatsApp real

Hoy el recordatorio se **configura** (cuándo y a qué hora) y la respuesta del paciente se **simula** con los botones "Sí, confirmo" / "No puedo ir" dentro de cada turno. Para que sea real hace falta:

- Cuenta de WhatsApp Business Platform (Meta) con una plantilla de recordatorio aprobada y botones de respuesta rápida.
- Una tarea programada que lea `configuracion` y los turnos del día y envíe la plantilla.
- Un webhook que reciba la respuesta y actualice `turnos.estado`.

Las dos últimas se pueden hacer con funciones de Vercel o de Supabase sin cambiar el resto de la app.
