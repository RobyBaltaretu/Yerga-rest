# Arrocería Yerga — web pública y panel de gestión

Una sola aplicación con dos caras: la web pública que convierte visitas en reservas y el
panel interno (`/panel`) donde la sala gestiona reservas y mesas en tiempo real. La
disponibilidad que ve el cliente sale siempre del mapa de mesas: si no hay mesa, no hay reserva.

- Definición de producto: [`docs/definicion-producto.pdf`](docs/definicion-producto.pdf)
- Plan de construcción: [`docs/PLAN.md`](docs/PLAN.md)
- Revisión de la definición y decisiones tomadas: [`docs/REVISION.md`](docs/REVISION.md)

## Stack

Next.js 16 (App Router, TypeScript estricto) · Tailwind CSS 4 · next-intl (`/es`, `/va`, `/en`)
· Supabase (PostgreSQL, Auth, Realtime) · Zod · GSAP + Lenis · Konva · Resend + React Email
· Cloudflare Turnstile · Cloudflare Workers con OpenNext · Vitest · Playwright.

## Requisitos

- Node.js 22 y pnpm 10
- Docker (para Supabase local)

## Puesta en marcha en local

```bash
pnpm install
pnpm db:start                       # arranca Supabase en Docker
cp .env.example .env.local          # y rellena las claves con:
pnpm supabase status -o env         #   ANON_KEY, SERVICE_ROLE_KEY, DB_URL
cp .env.local .dev.vars             # mismas variables para wrangler
pnpm dev                            # http://localhost:3000/es
```

> Si `supabase start` no puede descargar imágenes de `public.ecr.aws`, usa Docker Hub:
> `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io pnpm db:start`.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (panel y lectura de carta) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio, solo servidor (reserva pública, cron) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Anti-spam; por defecto, claves de prueba que siempre pasan |
| `RESEND_API_KEY` / `EMAIL_FROM` | Correo. Sin clave, los correos se guardan en la tabla `mensaje` |
| `NEXT_PUBLIC_SITE_URL` | URL pública, para enlaces de correo y datos estructurados |
| `CRON_SECRET` | Protege `/api/cron/tick` |
| `DATABASE_URL` | Solo pruebas: conexión directa a PostgreSQL |

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Next.js en desarrollo |
| `pnpm lint` / `pnpm typecheck` | ESLint y TypeScript |
| `pnpm test` | Vitest (motor de disponibilidad contra Supabase local) |
| `pnpm build && pnpm test:e2e` | Playwright en móvil y tableta contra el build |
| `pnpm db:reset` | Aplica migraciones y semilla desde cero |
| `pnpm db:types` | Regenera `lib/supabase/types.ts` |
| `pnpm preview` | Build de OpenNext y `wrangler dev` (simula Cloudflare Workers) |
| `pnpm cf:deploy` | Despliega a Cloudflare (requiere credenciales) |

## Despliegue en Cloudflare Workers

1. `pnpm wrangler login` (o variables `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`).
2. Secretos del Worker:
   ```bash
   pnpm wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   pnpm wrangler secret put TURNSTILE_SECRET_KEY
   pnpm wrangler secret put RESEND_API_KEY
   pnpm wrangler secret put CRON_SECRET
   ```
3. Las variables `NEXT_PUBLIC_*` se fijan en el build: defínelas en el entorno antes de `pnpm cf:deploy`.
4. El Cron Trigger (`*/5 * * * *`) está en `wrangler.jsonc` y llama a `/api/cron/tick`.

En GitHub, el job `desplegar` de `.github/workflows/ci.yml` despliega desde `main` cuando
existen los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` y las variables
`NEXT_PUBLIC_*` del entorno `produccion`.

> Nota: `@opennextjs/cloudflare@1.20.9` lleva un parche (`patches/`) para que incluya el
> manifiesto `preview-props.json` que genera Next.js 16.4. Se puede quitar cuando OpenNext
> lo soporte.

## Estado de las etapas

| Etapa | Estado |
|---|---|
| 1. Base | ✅ |
