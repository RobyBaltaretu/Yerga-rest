# SETUP — infraestructura y accesos de Arrocería Yerga

Estado a 9 de octubre de 2026. Este archivo no contiene ningún valor secreto.

## URL de trabajo

`https://arroceria-yerga.roberto-baltaretu.workers.dev`

Esta URL solo existirá si el Worker se llama **`arroceria-yerga`** en `wrangler.jsonc` (`"name": "arroceria-yerga"`). Supabase Auth, Turnstile, Web Analytics y `NEXT_PUBLIC_SITE_URL` ya apuntan a ella; si se elige otro nombre hay que actualizar los cuatro.

## Qué se ha creado y dónde

| Servicio | Recurso | Detalle | Panel |
|---|---|---|---|
| GitHub | Repositorio `RobyBaltaretu/Yerga-rest` | Ya existía; ahora es **público** (necesario para proteger ramas en el plan gratuito) | https://github.com/RobyBaltaretu/Yerga-rest |
| GitHub | Protección de `main` | Sin push forzado y sin borrado. Comprobaciones obligatorias: pendientes (ver abajo) | https://github.com/RobyBaltaretu/Yerga-rest/settings/branches |
| GitHub | Secretos y variables de Actions | Los carga `scripts/infra/configurar-secretos.sh` (ver abajo) | https://github.com/RobyBaltaretu/Yerga-rest/settings/secrets/actions |
| Supabase | Proyecto `arroceria-yerga` | Organización KreatyaLabs, plan gratuito, región `eu-west-3` (París), referencia `gudvwapcvoymmsgkmonc` | https://supabase.com/dashboard/project/gudvwapcvoymmsgkmonc |
| Supabase | Auth | Registro público desactivado. Site URL: la de workers.dev. Redirect URLs: `http://localhost:3000/**` y `https://arroceria-yerga.roberto-baltaretu.workers.dev/**` | https://supabase.com/dashboard/project/gudvwapcvoymmsgkmonc/auth/url-configuration |
| Cloudflare | Subdominio workers.dev | Activo: `roberto-baltaretu.workers.dev` | https://dash.cloudflare.com/?to=/:account/workers-and-pages |
| Cloudflare | Turnstile `yerga-reservas` | Modo gestionado. Hostnames: `localhost` y el de workers.dev. Clave del sitio: `0x4AAAAAAFRWL14UgnLaftpB` | https://dash.cloudflare.com/?to=/:account/turnstile |
| Cloudflare | Web Analytics | Sitio para el hostname de workers.dev. Token del beacon (público): `e86c3d3663134ae29ca9a69c4abb44f7`. Insertado en la web pública (`components/Analitica.tsx`) solo en producción | https://dash.cloudflare.com/?to=/:account/web-analytics |

El esquema de Supabase no se ha tocado: tablas y `btree_gist` las crean las migraciones del repositorio.

## Variables: dónde va cada una

En GitHub, los `NEXT_PUBLIC_*` y `ADMIN_EMAIL` son **variables** (se ven en claro; se
incrustan en el build). Todo lo demás son **secretos**. El estado real se comprueba con
`gh secret list` y `gh variable list` (solo muestran nombres).

| Nombre | GitHub | Worker | `.env.local` / `.dev.vars` | Origen |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | variable | en el build | sí | `https://gudvwapcvoymmsgkmonc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | variable | en el build | sí | API de Supabase (`api-keys`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | variable | en el build | sí | `yerga-reservas` (tabla de arriba) |
| `NEXT_PUBLIC_SITE_URL` | variable | `vars` de `wrangler.jsonc` | sí | URL de workers.dev |
| `ADMIN_EMAIL` | variable | no | no | Correo de la cuenta de GitHub del propietario |
| `SUPABASE_SERVICE_ROLE_KEY` | secreto | secreto | sí | API de Supabase (`api-keys`) |
| `TURNSTILE_SECRET_KEY` | secreto | secreto | sí | API de Cloudflare (widget `yerga-reservas`) |
| `RESEND_API_KEY` | secreto | secreto | sí | Clave `yerga-email` |
| `EMAIL_FROM` | secreto | secreto | sí | `Arrocería Yerga <onboarding@resend.dev>` |
| `CRON_SECRET` | secreto | secreto | sí | `openssl rand -hex 32` |
| `CLOUDFLARE_API_TOKEN` | secreto | no | no | Token `yerga-deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | secreto | no | no | Cuenta de Cloudflare |
| `SUPABASE_ACCESS_TOKEN` | secreto | no | no | Token personal de Supabase |
| `SUPABASE_PROJECT_REF` | secreto | no | no | `gudvwapcvoymmsgkmonc` |
| `SUPABASE_DB_PASSWORD` | secreto | no | no | Generada y fijada por el script |

## Tokens y permisos

| Nombre | Servicio | Permiso | Estado |
|---|---|---|---|
| `yerga-deploy` | Cloudflare | Cuenta: Workers Scripts, Workers KV y D1 (escritura); Account Settings, Workers Tail y Account Analytics (lectura). Equivale a «Edit Cloudflare Workers» sin R2 | Lo crea `scripts/infra/configurar-secretos.sh` |
| `yerga-email` | Resend | Solo envío (`sending_access`) | Lo crea el mismo script |
| `SUPABASE_ACCESS_TOKEN` | Supabase (token personal) | Acceso de la cuenta (Supabase no permite acotarlo) | El de `supabase login` o uno nuevo «yerga-ci» |

## Cómo se configuran los secretos (una vez, en el ordenador del propietario)

Desde la raíz del repositorio, con `gh`, `wrangler` y `supabase` con sesión iniciada y
`~/yerga-secrets.txt` con `CLOUDFLARE_BOOTSTRAP_TOKEN` y `RESEND_BOOTSTRAP_KEY`:

```bash
bash scripts/infra/configurar-secretos.sh
```

El script (ver su cabecera) genera `CRON_SECRET` y una contraseña nueva de la base (la
fija en Supabase), lee las claves de Supabase y la clave secreta de Turnstile, crea
`yerga-deploy` y `yerga-email`, y lo carga todo en GitHub Actions: **10 secretos** y **5
variables** (los cuatro `NEXT_PUBLIC_*` y `ADMIN_EMAIL`). Después escribe `.env.local` y
`.dev.vars`, exige «verificar» en `main`, lanza el despliegue, revoca el token temporal de
Cloudflare y borra `~/yerga-secrets.txt`. No imprime ningún valor.

Queda a mano: borrar la clave temporal de Resend en https://resend.com/api-keys.

## Qué hace cada despliegue (job `desplegar` de `.github/workflows/ci.yml`)

Al fusionar en `main` (o con «Run workflow»), y solo si están todos los secretos y
variables (si falta alguno, avisa y no despliega):

1. `supabase db push`: aplica las migraciones nuevas. **Nunca** `db reset`.
2. `scripts/produccion/crear-admin.mjs`: si no hay ningún administrador, crea el de
   `ADMIN_EMAIL` con cambio de contraseña obligatorio (la contraseña inicial es aleatoria
   y no se guarda).
3. `pnpm cf:deploy`: build de OpenNext y despliegue del Worker `arroceria-yerga`.
4. `wrangler secret bulk`: carga los secretos de ejecución en el Worker
   (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `CRON_SECRET`). `NEXT_PUBLIC_SITE_URL` va en `vars` de `wrangler.jsonc`.
5. `scripts/produccion/verificar.mjs`: `/es`, `/va`, `/en`, `/es/reservar` y
   `/panel/acceso` responden 200, `/panel` redirige al acceso, la disponibilidad no se
   cachea y `/api/cron/tick` da 401 sin secreto y 200 con él. Si algo falla, el job falla.

## Datos iniciales de producción

La migración `20261009000900_contenido_inicial.sql` carga el contenido de ejemplo
(configuración, zonas, plano, turnos, carta, textos, reseñas y plantillas) **solo si la
base está vacía**. Los usuarios `*@yerga.test` y las reservas de demostración están en
`supabase/seed.sql`, que solo se usa en local y en la CI.

**Primer acceso al panel:** `/panel/acceso` → «¿Has olvidado tu contraseña?» con el correo
de `ADMIN_EMAIL`. Supabase envía el enlace (su correo integrado solo entrega a miembros de
la organización de Supabase, que es el caso del propietario) y el panel pide elegir
contraseña.

## Copias de seguridad (0 €)

Repositorio **privado** `RobyBaltaretu/yerga-backups`, creado por
`scripts/infra/configurar-secretos.sh` a partir de la plantilla `infra/yerga-backups/`:

- Flujo diario (03:17 UTC): `supabase db dump --data-only` de los esquemas `public` y
  `auth`, comprimido y cifrado con `age`. Se borran del árbol las copias de más de 30 días.
- En el repositorio solo está la clave **pública** (variable `AGE_RECIPIENT`). La
  **privada** está únicamente en `~/yerga-backup-key.txt` del propietario: guárdala también
  en un gestor de contraseñas. Sin ella no se puede restaurar.
- **Restaurar:** pasos en `infra/yerga-backups/README.md` (migraciones con
  `supabase db push`, descifrar y cargar los datos con `psql`). Procedimiento probado de
  principio a fin contra una base de Supabase recién creada.

## Pendiente

Ver el resumen de `docs/BITACORA.md`: es la lista viva de lo hecho, lo pendiente y lo que
necesita del propietario.

## Limitaciones a tener en cuenta

- **Resend, remitente de pruebas** (`onboarding@resend.dev`): solo permite enviar a la dirección de correo de la propia cuenta de Resend; cualquier otro destinatario devuelve error 403. Hasta verificar un dominio, los clientes no recibirán confirmaciones ni recordatorios. El plan gratuito tiene además un tope diario y mensual de envíos; comprobar el vigente en https://resend.com/pricing.
- **Supabase gratuito**: pausa el proyecto tras 7 días sin actividad y no incluye copias de seguridad diarias descargables (`docs/REVISION.md`, punto 3.2).
- **Cloudflare Workers gratuito**: 3 MiB por Worker y 10 ms de CPU por petición; la aplicación puede superarlos (`docs/REVISION.md`, punto 3.1). Si el despliegue falla por esto, la alternativa es el plan de pago.
- **Repositorio público**: el código, `docs/` y los registros de Actions son visibles para cualquiera. Los secretos de Actions siguen cifrados y no se pasan a pull requests desde forks.

## Cuando haya dominio

1. **Cloudflare**: añadir el dominio a la cuenta (Domains → Add) y cambiar los servidores de nombres en el registrador.
2. **Worker**: Workers & Pages → `arroceria-yerga` → Settings → Domains & Routes → Add → Custom domain, o añadir `routes` con `custom_domain: true` en `wrangler.jsonc`.
3. **Resend**: Domains → Add domain, crear en Cloudflare los registros DNS que indique (SPF, DKIM y, recomendado, DMARC) y esperar a «Verified».
4. **Variables**: cambiar `EMAIL_FROM` a una dirección del dominio (por ejemplo `Arrocería Yerga <reservas@dominio>`) y `NEXT_PUBLIC_SITE_URL` a `https://dominio`, en GitHub Actions, en los secretos del Worker y en `.env.local` de producción. Volver a desplegar.
5. **Supabase Auth**: URL Configuration → Site URL con el dominio y añadir `https://dominio/**` a Redirect URLs. Mantener `localhost`.
6. **Turnstile**: `yerga-reservas` → Settings → añadir el dominio a Hostnames.
7. **Web Analytics**: añadir el dominio como sitio (con el dominio en Cloudflare se puede activar la inyección automática y quitar el snippet manual).
