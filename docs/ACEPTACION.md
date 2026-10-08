# Criterios de aceptación de la fase 1 y sus pruebas

Cada criterio de la definición de producto está cubierto por al menos una prueba
automatizada. Vitest prueba el motor contra PostgreSQL. Playwright prueba los flujos
completos en móvil (Pixel 7) y en tableta (Galaxy Tab S4 en horizontal).

| # | Criterio | Prueba |
|---|---|---|
| 1 | Con todas las mesas de un turno ocupadas o reservadas, la web no ofrece ninguna hora de ese turno. | `lib/availability/motor.test.ts` › «con todas las mesas de un turno ocupadas…» · `tests/e2e/reserva.spec.ts` › «un día con el turno lleno no ofrece horas» |
| 2 | Dos personas que intentan reservar la última mesa a la vez: solo una lo consigue y la otra recibe alternativas. | `lib/availability/motor.test.ts` › Concurrencia (dos conexiones reales en paralelo) |
| 3 | Sentar a un cliente sin reserva en el panel retira esa mesa de la web en menos de 5 segundos. | `tests/e2e/panel-servicio.spec.ts` › «sentar a un cliente sin reserva retira la mesa de la web en menos de 5 segundos» |
| 4 | Una mesa de 6 no se ofrece a 2 personas mientras haya una mesa menor libre. | `lib/availability/motor.test.ts` › «encaje de capacidad» |
| 5 | El encargado crea una distribución nueva, mueve mesas, cambia sillas y la publica; las reservas futuras se reasignan o se listan los conflictos. | `tests/e2e/mapa-editor.spec.ts` (crear y publicar; publicar con una reserva que no cabe queda bloqueado y lista el conflicto) |
| 6 | Una reserva se asigna y se cambia de mesa arrastrando, en tableta, y el cambio aparece en el resto de dispositivos sin recargar. | `tests/e2e/mapa-servicio.spec.ts` › arrastre · `tests/e2e/panel-servicio.spec.ts` › «un cambio en una tableta aparece en otra sin recargar» |
| 7 | Un cliente completa una reserva desde el móvil en menos de 60 segundos y recibe el correo de confirmación. | `tests/e2e/reserva.spec.ts` › flujo completo (mide el tiempo y comprueba el mensaje en la bandeja de salida) |
| 8 | El cliente modifica y cancela su reserva desde el enlace del correo, y la mesa vuelve a ofrecerse. | `tests/e2e/reserva.spec.ts` (modifica y cancela) · `lib/availability/motor.test.ts` › Gestión por código |
| 9 | La portada cumple el objetivo de carga en móvil y tiene alternativa sin movimiento. | `tests/e2e/rendimiento.spec.ts` › LCP en móvil con 4G lenta y CPU ×4 (mediana de 3, < 2,5 s) · `tests/e2e/web.spec.ts` (alternativa sin movimiento y animación con scroll) · Lighthouse en producción (ver nota) |
| 10 | El restaurante cambia un precio de la carta desde el panel y se ve en la web al momento. | `tests/e2e/contenidos.spec.ts` › «un cambio de precio se ve en la web al momento» |

Además:

- **Permisos por rol**, llamando directamente a la API de Supabase: `tests/unit/permisos.test.ts`;
  y la **matriz completa** tabla × rol × operación: `tests/unit/rls-matriz.test.ts`.
- **Seguridad** (cabeceras, CSP, recuperación de contraseña): `tests/e2e/seguridad.spec.ts`
  y `tests/e2e/recuperar.spec.ts`. Resumen en `docs/SEGURIDAD.md`.
- **Idiomas y buscadores** (canonical, hreflang con x-default, sitemap de 27 URL):
  `tests/e2e/web.spec.ts`.
- **Accesibilidad** (WCAG 2.1 A y AA, sin errores graves ni críticos con axe): 11 páginas
  públicas en los tres idiomas, el calendario de reserva y las 18 pantallas del panel:
  `tests/e2e/accesibilidad.spec.ts`.
- **Recordatorios y tareas programadas**: `tests/e2e/cron.spec.ts`.
- **Bloqueo de día reflejado en la web y gestión de usuarios**: `tests/e2e/contenidos.spec.ts`.

## Nota sobre el criterio 9 (carga de la portada)

Lighthouse en móvil sobre el build de producción, en local:

| Medición | LCP | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|---|
| Estrangulamiento real de DevTools (4G lenta, CPU ×4) | **1,8 s** | 75 | 100 | 100 | 92 |
| Estimación simulada (por defecto) | 2,6–3,1 s | 90–95 | 100 | 100 | 92 |

La medición real cumple el objetivo de menos de 2,5 s. La prueba automática
`rendimiento.spec.ts` lo repite en cada ejecución con las mismas condiciones (mediana
local: 1,85 s). La estimación simulada, que es la
que Lighthouse muestra por defecto, queda algo por encima. Esa estimación atribuye casi
todo el tiempo al «retraso de renderizado» del título. Hay que volver a medir en
producción, con el dominio y la CDN de Cloudflare, y con PageSpeed Insights sobre la URL
real.

## Cómo ejecutarlas

```bash
pnpm db:start && pnpm db:reset
pnpm test                       # 65 pruebas de Vitest
pnpm build && pnpm test:e2e     # Playwright (levanta el build en el puerto 3100)
```
