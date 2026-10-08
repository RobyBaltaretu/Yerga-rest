# Encargo: infraestructura a coste cero, cierre de la configuración y primer despliegue

Este documento es un encargo para el agente de código. Sustituye a las recomendaciones de
pago de `docs/REVISION.md` (puntos 3.1 y 3.2) y completa `SETUP.md`.

**Objetivo:** la web y el panel funcionando en
`https://arroceria-yerga.roberto-baltaretu.workers.dev` con 0 €/mes de coste fijo.

**Regla de coste:** solo planes gratuitos. Si algún paso pide tarjeta, pago o subir de
plan, para y pregunta al propietario. No registres ningún dominio.

## 0. Autorización del propietario y manejo de secretos

El propietario del proyecto autoriza al agente de código a leer los secretos de este
proyecto y a configurarlos en GitHub Actions y en el Worker de Cloudflare, con estas
condiciones:

- Los secretos nunca se escriben en el chat, en el repositorio (es **público**), en
  registros de CI ni en mensajes de commit. Tampoco en `SETUP.md`.
- Solo viven en: el archivo local del propietario (ver 0.2), `.env.local` y `.dev.vars`
  (ambos ignorados por git), los secretos de GitHub Actions y los secretos del Worker.
- Usa siempre las CLI oficiales (`gh`, `wrangler`, `supabase`); no extraigas claves de
  los paneles web con el navegador.
- No toques otros proyectos de las cuentas: el Worker `viveros-baltaretu`, el widget de
  Turnstile «Web vivero» ni el proyecto de Supabase `InmoAgentAI`.

### 0.1 Dónde tiene que ejecutarse este encargo

En el ordenador del propietario (Claude Code en terminal o en la app de escritorio), no en
una sesión en la nube: desde la nube no se puede escribir en los secretos de GitHub Actions
ni leer el archivo local de secretos. Antes de empezar, comprueba y, si falta, pide al
propietario que inicie sesión él mismo:

```bash
gh auth status          # si falla: gh auth login
pnpm wrangler whoami    # si falla: pnpm wrangler login
pnpm supabase projects list   # si falla: pnpm supabase login
```

### 0.2 Genera y coloca tú todos los secretos

El propietario quiere que generes o recuperes **todos** los secretos y los dejes en su
sitio sin que él copie nada a mano. Para cada uno, usa la vía indicada; guarda los valores
solo en un archivo temporal fuera del repositorio (`~/.yerga-secrets.env`, `chmod 600`) y
bórralo al terminar.

| Secreto | Cómo lo obtienes |
|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `pnpm supabase projects api-keys --project-ref gudvwapcvoymmsgkmonc` |
| `SUPABASE_DB_PASSWORD` | Genera una contraseña fuerte (`openssl rand -base64 32`, sin caracteres que rompan una URL) y establécela con la Management API de Supabase (actualización de la contraseña de la base de datos del proyecto). La que se generó al crear el proyecto no está guardada: hay que sustituirla |
| `SUPABASE_ACCESS_TOKEN` | Token personal para la CI. Créalo con la Management API o la CLI si la versión actual lo permite; si no, reutiliza el que deja `supabase login` en este equipo |
| `TURNSTILE_SECRET_KEY` | API de Cloudflare: lee el widget `yerga-reservas` (clave del sitio en `SETUP.md`), cuya respuesta incluye la clave secreta |
| `CLOUDFLARE_API_TOKEN` | API de Cloudflare: crea un token `yerga-deploy` con los permisos de la plantilla «Edit Cloudflare Workers», limitado a esta cuenta |
| `RESEND_API_KEY` | API de Resend: crea una clave `yerga-email` con permiso `sending_access` |

Comprueba cada vía en la documentación actual del proveedor antes de usarla; no inventes
rutas de API.

**Dos límites que no dependen de ti.** Crear tokens por API exige una credencial previa
con permiso para ello, y las sesiones de `wrangler login` y de Resend no lo traen:

- **Cloudflare:** la sesión OAuth de `wrangler` no puede crear tokens de API ni leer
  Turnstile. Si la API lo rechaza, pide al propietario **una sola cosa**: un token
  temporal creado con la plantilla «Create Additional Tokens», más permiso de lectura de
  Turnstile. Con él creas `yerga-deploy`, lees la clave de Turnstile y le avisas para que
  lo revoque.
- **Resend:** no tiene inicio de sesión por CLI. Pide al propietario una clave temporal
  de acceso completo; con ella creas `yerga-email` (solo envío) y le avisas para que
  borre la temporal.

Pide esas credenciales temporales de una vez, al principio, por el canal que el
propietario prefiera que no sea el repositorio (lo normal: que las escriba él en
`~/.yerga-secrets.env`). No sigas con valores de relleno.

**Dónde va cada uno** (detalle en la sección 2):

- GitHub Actions: todos los secretos, con `gh secret set`; los `NEXT_PUBLIC_*`, además,
  como variables.
- Worker de Cloudflare: los de ejecución, con `pnpm wrangler secret bulk`.
- `.env.local` y `.dev.vars` del equipo: los nueve de ejecución.

Al terminar, verifica con `gh secret list`, `gh variable list` y
`pnpm wrangler secret list` (muestran nombres, no valores) y anota en `SETUP.md` el nombre
y el permiso de cada token creado.

## 1. Ajustes de arquitectura para caber en el plan gratuito

El límite que manda es el de **Cloudflare Workers gratuito: 10 ms de CPU por petición**
(100.000 peticiones al día). Esperar a Supabase no cuenta como CPU; renderizar React en el
servidor, sí. Hoy `app/[locale]/layout.tsx` y `app/panel/(app)/layout.tsx` fuerzan
renderizado dinámico en cada petición, que es justo lo que más CPU gasta.

Criterio de aceptación común: tras el despliegue, el percentil 99 de CPU por petición del
Worker queda por debajo de 10 ms y no hay errores 1102 (métricas del Worker en el panel de
Cloudflare o `pnpm wrangler tail`).

### 1.1 Web pública prerenderizada

- Portada, arroces, carta, la casa, contacto, páginas SEO y textos legales se generan en
  el build para los tres idiomas y se sirven como recursos estáticos. Quita
  `force-dynamic` del layout público.
- Un cambio desde el panel (precio, texto, horario) debe verse sin volver a desplegar:
  revalidación bajo demanda al guardar. Con OpenNext eso requiere caché incremental y
  caché de etiquetas; usa las opciones que son gratuitas sin tarjeta (Workers KV y D1 o
  Durable Objects) y confírmalo en la documentación actual de OpenNext para Cloudflare.
  **No uses R2**: pide método de pago aunque el uso sea gratuito.
- Lo que depende de datos vivos no se prerenderiza: el aviso «Quedan N mesas» del botón
  de reserva se pide desde el navegador a `/api/disponibilidad`, y el flujo
  `/[locale]/reservar` sigue siendo dinámico. **La disponibilidad no se cachea nunca**
  (criterio 3.8 de la revisión).

### 1.2 Panel como aplicación de navegador

- Las pantallas del panel pasan a componentes de cliente que leen de Supabase con la
  sesión del usuario (RLS y funciones RPC, que ya existen). El servidor solo comprueba la
  sesión en `proxy.ts` y entrega la carcasa.
- Las escrituras que necesitan la clave de servicio siguen en Server Actions; son ligeras.
- Los permisos no cambian: los aplica la base de datos, no la interfaz.

### 1.3 Copia de seguridad diaria sin coste

Supabase gratuito no incluye copias. Como este repositorio es público, las copias no
pueden guardarse aquí.

- Crea un repositorio **privado** `yerga-backups` con un flujo programado diario:
  `pg_dump` de la base de producción, cifrado con `age` (clave pública en el repositorio,
  clave privada solo en poder del propietario), commit del archivo cifrado y borrado de
  los que tengan más de 30 días.
- Documenta en `SETUP.md` cómo restaurar y recuerda al propietario que guarde la clave
  privada fuera de GitHub.
- La pausa por inactividad de Supabase (7 días) no afecta: el cron de cada 5 minutos ya
  consulta la base.

### 1.4 Si no se consigue

Si tras 1.1 y 1.2 el Worker sigue superando los 10 ms de forma constante, **para e
informa** con las mediciones. La decisión de pasar a Workers de pago (5 USD/mes) es del
propietario. Vercel no es alternativa para producción: su plan gratuito prohíbe el uso
comercial.

## 2. Cerrar la configuración de la infraestructura

Lo ya creado está en `SETUP.md`. Falta:

1. **Nombre del Worker.** En `wrangler.jsonc` cambia `"name": "yerga"` por
   `"arroceria-yerga"`, y lo mismo en `services[0].service`. Supabase Auth, Turnstile, Web
   Analytics y `NEXT_PUBLIC_SITE_URL` ya apuntan a
   `arroceria-yerga.roberto-baltaretu.workers.dev`.
2. **GitHub Actions.** El job `desplegar` lee `secrets.CLOUDFLARE_*` y `vars.NEXT_PUBLIC_*`
   en el entorno `produccion`. Ahora mismo hay seis valores cargados como secretos de
   repositorio (lista en `SETUP.md`). Deja el flujo y la configuración coherentes:
   - Variables (`gh variable set`): `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
     `NEXT_PUBLIC_SITE_URL`.
   - Secretos (`gh secret set`): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
     `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
     `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
     `CRON_SECRET`.
   - Comprueba con `gh secret list` y `gh variable list`.
3. **Migraciones en producción.** Añade al job `desplegar`, antes del despliegue, un paso
   que aplique las migraciones (`supabase link` + `supabase db push`) con
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` y `SUPABASE_DB_PASSWORD`. No ejecutes
   `supabase db reset` contra producción.
4. **Datos iniciales.** En producción no se carga `seed.sql` tal cual: contiene usuarios
   `*@yerga.test` con contraseñas conocidas. Carga solo los datos de ejemplo de contenido
   (configuración, turnos, zonas, mesas, carta, textos), que siguen marcados como
   «ejemplo», y crea un único usuario administrador con el correo que indique el
   propietario, con cambio de contraseña obligatorio en el primer acceso.
5. **Analítica.** Inserta el snippet de Cloudflare Web Analytics en el layout raíz con el
   token público que figura en `SETUP.md`.
6. **`.env.local` y `.dev.vars`** locales con los nueve valores de ejecución, para poder
   probar con `pnpm preview`.

## 3. Primer despliegue y verificación

1. Abre un pull request con los cambios de 1 y 2; la CI debe pasar completa.
2. Al fusionar en `main`, el job `desplegar` crea el Worker.
3. Carga los secretos de ejecución en el Worker con `pnpm wrangler secret bulk`:
   `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `CRON_SECRET` y cualquier otra variable que el código lea en ejecución y no quede
   incrustada en el build. Comprueba con `pnpm wrangler secret list`.
4. Verifica, con llamadas reales:
   - `pnpm wrangler whoami` con el token `yerga-deploy`.
   - `pnpm supabase migration list` contra el proyecto: todas las migraciones aplicadas.
   - `curl https://api.resend.com/domains` con la clave: responde 200 o, si la clave es
     solo de envío, el error de permiso esperado (no un 401 de clave inválida).
   - La URL de workers.dev responde 200 en `/es`, `/va` y `/en`.
   - El Cron Trigger `*/5 * * * *` aparece en `pnpm wrangler triggers` o en el panel, y
     `/api/cron/tick` responde 401 sin `CRON_SECRET` y 200 con él.
   - Una reserva de prueba de principio a fin en la URL pública, con Turnstile real, y el
     acceso al panel con el usuario administrador.
   - CPU por petición según el criterio de la sección 1.
5. **Protección de `main`:** una vez haya corrido la CI, exige el trabajo `verificar` como
   comprobación obligatoria (Settings → Branches → `main`).

## 4. Limitaciones conocidas que no se resuelven aquí

- **Correo:** con el remitente de pruebas `onboarding@resend.dev` Resend solo entrega a
  la dirección de la propia cuenta. Los clientes no recibirán confirmaciones ni
  recordatorios hasta verificar un dominio. Mientras tanto, la confirmación en pantalla y
  el enlace de gestión deben bastar, y los correos fallidos quedan en la tabla `mensaje`.
- **Dominio:** pasos en la sección «Cuando haya dominio» de `SETUP.md`.

## 5. Entrega

- `SETUP.md` actualizado: estado real de cada secreto y variable, nombre y permiso de
  cada token, mediciones de CPU, cómo restaurar una copia y qué queda pendiente.
- `README.md` y `docs/PLAN.md` coherentes con lo construido.
- Resumen final al propietario: hecho, pendiente y qué necesita de él.
