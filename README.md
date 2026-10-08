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

## Base de datos

- `supabase/migrations/…_esquema.sql`: todas las entidades del modelo de datos y la
  restricción `asignacion_sin_solape` (una mesa no admite dos intervalos solapados; el
  intervalo incluye el margen de recogida).
- `supabase/migrations/…_seguridad.sql`: permisos por rol (RLS), protección de datos
  legales, auditoría (`registro_cambios`) y publicación de tiempo real.
- `supabase/migrations/…_disponibilidad.sql`: el motor. `horas_disponibles`,
  `retener_mesa`, `confirmar_reserva` (atómica), gestión por código, operaciones del
  panel (`crear_reserva_personal`, `asignar_reserva`, `cambiar_estado`,
  `reorganizar_turno`…) y `tick` para tareas periódicas.
- `supabase/seed.sql`: **único archivo de datos de ejemplo** (plano, turnos, carta,
  textos, plantillas, usuarios y ~30 reservas de la semana en curso). Sustituirlo por los
  datos reales es lo único necesario para pasar a producción.

Usuarios de ejemplo (contraseña a cambiar en el primer acceso):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `administrador@yerga.test` | `Yerga-Admin-2026` |
| Encargado | `encargado@yerga.test` | `Yerga-Encargado-2026` |
| Sala | `sala@yerga.test` | `Yerga-Sala-2026` |

Las pruebas del motor (`lib/availability/motor.test.ts`) cubren cada regla de
disponibilidad, la restricción contra solapes, la retención y una prueba de concurrencia
con dos confirmaciones simultáneas sobre la última mesa: solo una gana.

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
| 2. Datos | ✅ |
| 3. Motor de disponibilidad | ✅ |
| 4. Reserva pública | ✅ |
| 5. Acceso y estructura del panel | ✅ |
| 6. Reservas en el panel | ✅ |
| 7. Mapa de mesas: edición | ✅ |
| 8. Mapa de mesas: servicio | ✅ |
| 9. Web pública | ✅ (ver nota de rendimiento en docs/DUDAS.md) |
| 10. Contenidos y configuración | ✅ |
