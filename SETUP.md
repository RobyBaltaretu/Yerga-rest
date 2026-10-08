# SETUP — infraestructura y accesos de Arrocería Yerga

Estado a 8 de octubre de 2026. Este archivo no contiene ningún valor secreto.

## URL de trabajo

`https://arroceria-yerga.roberto-baltaretu.workers.dev`

Esta URL solo existirá si el Worker se llama **`arroceria-yerga`** en `wrangler.jsonc` (`"name": "arroceria-yerga"`). Supabase Auth, Turnstile, Web Analytics y `NEXT_PUBLIC_SITE_URL` ya apuntan a ella; si se elige otro nombre hay que actualizar los cuatro.

## Qué se ha creado y dónde

| Servicio | Recurso | Detalle | Panel |
|---|---|---|---|
| GitHub | Repositorio `RobyBaltaretu/Yerga-rest` | Ya existía; ahora es **público** (necesario para proteger ramas en el plan gratuito) | https://github.com/RobyBaltaretu/Yerga-rest |
| GitHub | Protección de `main` | Sin push forzado y sin borrado. Comprobaciones obligatorias: pendientes (ver abajo) | https://github.com/RobyBaltaretu/Yerga-rest/settings/branches |
| GitHub | Secretos de Actions | 6 de 14 cargados (ver tabla de variables) | https://github.com/RobyBaltaretu/Yerga-rest/settings/secrets/actions |
| Supabase | Proyecto `arroceria-yerga` | Organización KreatyaLabs, plan gratuito, región `eu-west-3` (París), referencia `gudvwapcvoymmsgkmonc` | https://supabase.com/dashboard/project/gudvwapcvoymmsgkmonc |
| Supabase | Auth | Registro público desactivado. Site URL: la de workers.dev. Redirect URLs: `http://localhost:3000/**` y `https://arroceria-yerga.roberto-baltaretu.workers.dev/**` | https://supabase.com/dashboard/project/gudvwapcvoymmsgkmonc/auth/url-configuration |
| Cloudflare | Subdominio workers.dev | Activo: `roberto-baltaretu.workers.dev` | https://dash.cloudflare.com/?to=/:account/workers-and-pages |
| Cloudflare | Turnstile `yerga-reservas` | Modo gestionado. Hostnames: `localhost` y el de workers.dev. Clave del sitio: `0x4AAAAAAFRWL14UgnLaftpB` | https://dash.cloudflare.com/?to=/:account/turnstile |
| Cloudflare | Web Analytics | Sitio para el hostname de workers.dev. Token del beacon (público): `e86c3d3663134ae29ca9a69c4abb44f7`. Requiere insertar el snippet JS en el `<head>` | https://dash.cloudflare.com/?to=/:account/web-analytics |

El esquema de Supabase no se ha tocado: tablas y `btree_gist` las crean las migraciones del repositorio.

## Variables: dónde va cada una y estado

| Variable | `.env.local` y Worker | GitHub Actions | Estado en GitHub | Dónde se obtiene |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sí | sí | cargada | `https://gudvwapcvoymmsgkmonc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | sí | **pendiente** | Supabase → Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | sí | **pendiente** | Supabase → Settings → API Keys |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | sí | sí | cargada | Turnstile → `yerga-reservas` |
| `TURNSTILE_SECRET_KEY` | sí | sí | **pendiente** | Turnstile → `yerga-reservas` → Settings |
| `RESEND_API_KEY` | sí | sí | **pendiente** | Resend → API Keys (crear `yerga-email`) |
| `EMAIL_FROM` | sí | sí | cargada | `Arrocería Yerga <onboarding@resend.dev>` |
| `NEXT_PUBLIC_SITE_URL` | sí | sí | cargada | URL de workers.dev |
| `CRON_SECRET` | sí | sí | **pendiente** | Generar: `openssl rand -hex 32` |
| `CLOUDFLARE_API_TOKEN` | no | sí | **pendiente** | Cloudflare → API Tokens (crear `yerga-deploy`) |
| `CLOUDFLARE_ACCOUNT_ID` | no | sí | cargada | Workers & Pages → Account details |
| `SUPABASE_ACCESS_TOKEN` | no | sí | **pendiente** | Supabase → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | no | sí | cargada | `gudvwapcvoymmsgkmonc` |
| `SUPABASE_DB_PASSWORD` | no | sí | **pendiente** | Supabase → Database → Settings → Reset database password |

## Tokens y permisos

| Nombre | Servicio | Permiso | Estado |
|---|---|---|---|
| `yerga-deploy` | Cloudflare | Plantilla «Edit Cloudflare Workers», limitado a esta cuenta | Por crear |
| `yerga-email` | Resend | Solo envío («Sending access») | Por crear |
| `yerga-cli` | Supabase (token personal) | Acceso de la cuenta (Supabase no permite acotarlo) | Por crear |

## Pendiente y por qué

1. **Ocho secretos sin cargar** (marcados arriba). El asistente que preparó la infraestructura no puede leer ni copiar claves desde los paneles, así que los copia el propietario. Pasos en «Cómo cargar los secretos».
2. **Contraseña de la base de datos**: se generó una al crear el proyecto pero no se guardó en ningún sitio. Hay que restablecerla en Supabase y guardar la nueva como `SUPABASE_DB_PASSWORD`.
3. **`.env.local`**: no existe porque no hay copia local del proyecto. Se crea copiando `.env.example` cuando alguien lo clone.
4. **Comprobaciones obligatorias en `main`**: no se pueden exigir hasta que exista `.github/workflows/ci.yml` y haya corrido una vez. Entonces: Settings → Branches → `main` → «Require status checks to pass» y elegir los trabajos de CI.
5. **Secretos del Worker y Cron Trigger**: el Worker no existe hasta el primer despliegue. Después, cargar las nueve variables de ejecución con `wrangler secret bulk` y comprobar en Workers & Pages → `arroceria-yerga` → Settings → Triggers que aparece `*/5 * * * *`.
6. **Verificaciones** (`wrangler whoami`, CLI de Supabase, API de Resend): pendientes de que existan los tokens.
7. **Primer despliegue**: el repositorio solo contiene `docs/`; no hay código desplegable.
8. **Snippet de Web Analytics**: insertarlo en el layout raíz con el token indicado arriba.

## Cómo cargar los secretos

Con la CLI de GitHub, desde una carpeta que no sea el repositorio:

```bash
# 1. Crea un archivo temporal con los ocho valores pendientes (formato NOMBRE=valor)
nano yerga-secrets.env
# 2. Súbelos todos de una vez
gh secret set -f yerga-secrets.env --repo RobyBaltaretu/Yerga-rest
# 3. Borra el archivo
rm yerga-secrets.env
```

O uno a uno en https://github.com/RobyBaltaretu/Yerga-rest/settings/secrets/actions/new.

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
