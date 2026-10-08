# Vista previa en Vercel con Supabase

La vista previa sirve para revisar la web y el panel con los datos de ejemplo. No es
producción: usa los usuarios `*@yerga.test` y no envía correos de verdad (sin
`RESEND_API_KEY` se guardan como «simulados» en la tabla `mensaje`).

El proyecto de Vercel `yerga-rest` ya está creado y enlazado a GitHub. Despliega la rama
`fase-1`. Falta la base de datos: hay que crearla una vez.

## 1. Crear la base de datos (unos 5 minutos)

1. En <https://supabase.com/dashboard>, crea un proyecto nuevo. Nombre: `yerga-vista-previa`.
   Región: **West EU (Ireland)** o **Central EU (Frankfurt)**. El plan gratuito basta.
2. Cuando esté listo, abre **SQL Editor** → **New query**.
3. Pega el contenido completo de
   [`supabase/vista-previa.sql`](../supabase/vista-previa.sql) y pulsa **Run**. El archivo
   contiene todas las migraciones y los datos de ejemplo. Debe terminar sin errores.
4. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**.
   El panel no admite altas públicas. Los tres usuarios de ejemplo siguen pudiendo entrar.

## 2. Pasar las claves a Vercel

Las claves están en Supabase → **Project Settings → API Keys** (pestaña «Legacy API keys»)
y en **Data API** (la URL).

| Variable en Vercel | Valor | Tipo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) | Plain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` `public` | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` (secreta) | Sensitive |

Hay dos formas de cargarlas:

- **Tú, en Vercel:** proyecto `yerga-rest` → Settings → Environment Variables. Márcalas
  para *Preview*. Después, en Deployments, pulsa **Redeploy** en el último despliegue.
- **Yo:** pásame la URL y la clave `anon`. La clave `service_role` mejor ponla tú en Vercel
  como *Sensitive*, para que no pase por el chat. Yo cargo el resto y vuelvo a desplegar.

Las variables `NEXT_PUBLIC_*` se fijan al compilar, así que cualquier cambio necesita un
nuevo despliegue.

## 3. Probar

| Qué | Dónde |
|---|---|
| Web pública | `/es`, `/va`, `/en` |
| Reservar | `/es/reservar` |
| Panel | `/panel`. Usuarios de la tabla del README, p. ej. `encargado@yerga.test` / `Yerga-Encargado-2026` |

La vista previa está protegida por **Vercel Authentication**: solo la ve quien haya
iniciado sesión en tu cuenta de Vercel. Para enseñarla a otra persona, usa
**Share** en el despliegue o desactiva la protección en Settings → Deployment Protection.

## Diferencias con producción

- **Hosting.** El destino final sigue siendo Cloudflare Workers, ver el README. Vercel es
  solo para la vista previa: el código es el mismo.
- **Tareas programadas.** La tarea de cada 5 minutos (`/api/cron/tick`: recordatorios,
  agradecimientos, marcar «sin confirmar») no corre en la vista previa. Las retenciones
  caducadas se limpian solas en cada consulta, así que el motor de reservas no depende de
  ella.
- **Turnstile y correo.** Están desactivados mientras no se pongan sus claves.
- **Datos de ejemplo.** Las reservas de la semilla se crean alrededor de la fecha en que se
  ejecuta el SQL. Para refrescarlas, vuelve a crear el proyecto o ejecuta de nuevo el
  archivo sobre una base vacía.

Si cambian las migraciones, regenera el archivo con `./scripts/sql-vista-previa.sh`.
