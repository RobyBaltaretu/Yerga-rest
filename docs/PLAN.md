# Plan detallado de construcción — Arrocería Yerga, fase 1

Este plan desarrolla la sección «Plan de construcción» de la definición de producto
(`docs/definicion-producto.pdf`, versión del 8 de octubre de 2026). Lo que aquí se fija son
decisiones de implementación; cuando el documento deja un hueco se aplica el supuesto
de partida y se deja configurable en el panel (ver `docs/REVISION.md`).

## 0. Principios de implementación

| Principio | Cómo se aplica |
|---|---|
| Una única fuente de verdad | Toda la lógica de disponibilidad, retención y confirmación vive en funciones PL/pgSQL. Next.js solo las llama. |
| La base de datos defiende sola | Restricción de exclusión `btree_gist` sobre `asignacion` y sobre `retencion`; RLS por rol en todas las tablas; funciones `security definer` con `search_path` fijo. |
| Hora local explícita | Todo instante se guarda como `timestamptz`. Fechas y horas de turno se interpretan siempre con `at time zone 'Europe/Madrid'`, nunca con la zona del servidor. |
| Todo es configurable | Reglas en la tabla `configuracion` (fila única), turnos en `turno`, bloqueos en `bloqueo`, textos en `contenido`, carta en `plato`. Nada de esto está en código. |
| Semilla única | `supabase/seed.sql` contiene todos los datos de ejemplo del restaurante; reemplazarla es la única tarea para pasar a datos reales. |
| Sin secretos en el repo | `.env.example` documenta las variables; `.env.local` y `.dev.vars` están en `.gitignore`. |
| Degradación elegante | Sin claves de Resend los correos se guardan en la bandeja de salida (`mensaje`) y se registran en consola; sin Turnstile se usan las claves de prueba oficiales. |

## 1. Arquitectura

```
Navegador (cliente)          Navegador (panel, tableta)
      │  HTML/RSC                   │  RSC + Supabase Realtime (websocket)
      ▼                             ▼
┌──────────────────── Next.js 16 (App Router) en Cloudflare Workers ───────────────┐
│ app/[locale]/(public)  app/[locale]/reservar  app/panel  app/api/cron             │
│ Server Actions ── Zod ── lib/availability (cliente RPC tipado)                     │
└───────────────┬──────────────────────────────────┬────────────────────────────────┘
                │ service_role (solo servidor)     │ sesión del usuario (RLS)
                ▼                                  ▼
        ┌──────────────── Supabase: PostgreSQL 17 + Auth + Realtime ───────────────┐
        │ funciones: horas_disponibles · retener_mesa · confirmar_reserva · ...     │
        │ restricción asignacion_sin_solape · RLS por rol · triggers de auditoría   │
        └───────────────────────────────────────────────────────────────────────────┘
Cloudflare Cron Trigger (cada 5 min) ──► /api/cron/tick ──► caducar retenciones,
                                                           recordatorios 24 h, sin confirmar
```

- **Cliente público**: nunca toca la base de datos directamente. Todas las lecturas de
  disponibilidad y escrituras pasan por Server Actions que verifican Turnstile, aplican
  límite de intentos y llaman a funciones RPC con la clave de servicio.
- **Panel**: usa la sesión del usuario (cookies con `@supabase/ssr`), de modo que RLS
  aplica los permisos también si alguien llama a la API de Supabase directamente.
- **Lecturas públicas de contenido** (carta, textos, horarios): rol `anon` con políticas de
  solo lectura sobre filas visibles. Así un cambio de precio se ve al momento (las páginas
  de carta se renderizan dinámicamente o con revalidación por etiqueta al guardar).

### Ajustes para el plan gratuito (8 oct 2026)

Para no superar los 10 ms de CPU por petición de Cloudflare Workers gratuito, tres
decisiones sustituyen a lo anterior donde haya conflicto. El detalle y los criterios de
aceptación están en `docs/INFRA-COSTE-CERO.md`.

- **Web pública prerenderizada**: las páginas de contenido se generan en el build y se
  revalidan bajo demanda al guardar desde el panel. La disponibilidad no se cachea nunca;
  el aviso de mesas libres se pide desde el navegador.
- **Panel como aplicación de navegador**: las pantallas leen de Supabase con la sesión del
  usuario (RLS y RPC); el servidor solo comprueba la sesión y atiende las escrituras que
  requieren la clave de servicio.
- **Copia de seguridad diaria** cifrada en un repositorio privado.

### Despliegue y datos de producción (9 oct 2026)

- Worker `arroceria-yerga`; el job `desplegar` de la CI aplica migraciones, crea el primer
  administrador si falta, despliega, carga los secretos del Worker y verifica la URL.
- Contenido de ejemplo en una migración idempotente (solo con la base vacía); los datos
  de demostración (`seed.sql`) nunca llegan a producción.
- Recuperación de contraseña del panel por correo (`/panel/acceso/recuperar`): es la vía
  del primer acceso del administrador y de cualquier olvido.
- Cloudflare Web Analytics en la web pública (sin cookies), no en el panel.

## 2. Modelo de datos (etapa 2)

Nombres en castellano y singular, como en el documento.

| Tabla | Campos clave | Notas de implementación |
|---|---|---|
| `configuracion` | fila única `id = 1`: `intervalo_min` 15, `duracion_hasta_4` 105, `duracion_desde_5` 135, `umbral_duracion_larga` 5, `margen_min` 15, `antelacion_min_min` 120, `antelacion_max_dias` 60, `max_comensales_online` 10, `retencion_min` 5, `cortesia_min` 15, `cancelacion_libre_horas` 3, `recordatorio_horas` 24, `aviso_conflicto_min` 15, datos del local (nombre, dirección, teléfono, WhatsApp, coordenadas) | `check (id = 1)` |
| `zona` | `nombre`, `slug`, `orden`, `activa` | sala, terraza |
| `distribucion` | `zona_id`, `nombre`, `estado` (borrador/publicada), `predeterminada`, `borrador jsonb`, `publicada_en`, `version` | El editor trabaja sobre `borrador`; «Publicar» lo vuelca a filas reales |
| `programacion_distribucion` | `distribucion_id`, `fecha?`, `dia_semana?`, `turno_id?` | Prioridad: fecha > día+turno > día > predeterminada |
| `mesa` | `distribucion_id`, `nombre`, `forma`, `x`, `y`, `giro`, `ancho`, `alto`, `capacidad_min`, `capacidad_max`, `sillas jsonb`, `tronas`, `plazas_silla_ruedas`, `reservable_online`, `activa` | Las sillas son parte de la mesa |
| `combinacion` | `distribucion_id`, `nombre`, `capacidad_min`, `capacidad_max`, `reservable_online` + `combinacion_mesa(combinacion_id, mesa_id)` | Solo las definidas |
| `elemento_fijo` | `distribucion_id`, `tipo`, `x`, `y`, `giro`, `ancho`, `alto`, `etiqueta` | pared, barra, columna, puerta, ventana, cocina, planta |
| `turno` | `nombre` (comida/cena), `dia_semana` 0–6, `inicio`, `fin`, `ultima_hora`, `tope_franja`, `activo` | Una fila por día y servicio |
| `bloqueo` | `ambito` (dia/turno/zona/mesa), `desde`, `hasta`, `turno_id?`, `zona_id?`, `mesa_id?`, `motivo` | Rango `tstzrange` |
| `cliente` | `nombre`, `telefono` (único, normalizado E.164), `correo`, `idioma`, `alergias`, `notas_internas`, `consiente_comercial`, `consiente_privacidad_en`, `ultima_visita` | Identificado por teléfono |
| `reserva` | `cliente_id`, `inicio timestamptz`, `comensales`, `duracion_min`, `estado`, `origen` (web/telefono/puerta), `zona_preferida_id`, `turno_id`, `notas`, `ocasion`, `trona`, `silla_ruedas`, `alergias`, `codigo_gestion` (único, aleatorio), `reconfirmada_en`, `sentada_en`, `finalizada_en`, `forzada`, `idioma` | Estados: pendiente, confirmada, reconfirmada, sentada, finalizada, cancelada, no_presentada, sin_confirmar (marca, ver revisión) |
| `asignacion` | `reserva_id`, `mesa_id`, `intervalo tstzrange`, `activa` | **`exclude using gist (mesa_id with =, intervalo with &&) where (activa)`**. El intervalo incluye el margen de 15 min |
| `retencion` | `mesa_id`, `intervalo`, `caduca_en`, `token`, `comensales`, `zona_id` | Misma restricción de exclusión; las caducadas se borran dentro de cada función antes de operar |
| `encargo_arroz` | `reserva_id`, `plato_id`, `raciones` | Alimenta «Arroces del día» |
| `lista_espera` | `cliente_id`, `fecha`, `turno_id`, `comensales`, `estado`, `avisado_en` | Captura en fase 1, avisos completos en fase 2 |
| `plato` | `categoria`, `nombre jsonb {es,va,en}`, `descripcion jsonb`, `precio`, `alergenos text[]` (14 del Reglamento 1169/2011), `min_comensales`, `foto_url`, `visible`, `orden`, `es_ejemplo` | |
| `contenido` | `clave`, `valor jsonb {es,va,en}` | Titulares, avisos, textos de secciones |
| `usuario` | `id` = `auth.users.id`, `nombre`, `correo`, `rol` (administrador/encargado/sala), `debe_cambiar_clave` | |
| `registro_cambios` | `usuario_id`, `accion`, `entidad`, `entidad_id`, `antes jsonb`, `despues jsonb`, `creado_en` | Trigger genérico en tablas sensibles |
| `mensaje` | `reserva_id`, `tipo`, `destinatario`, `idioma`, `asunto`, `cuerpo`, `estado`, `enviado_en`, `error` | Bandeja de salida de correos; da idempotencia a los recordatorios |
| `limite_intentos` | `clave`, `ventana`, `contador` | Límite de intentos para reserva y acceso |

### Permisos (RLS)

| Rol | Puede |
|---|---|
| `anon` | Leer `plato` visibles, `contenido`, `turno`, `zona`, `configuracion` (columnas públicas vía vista). Nada más. |
| `sala` | Leer todo lo operativo; crear y editar reservas, asignaciones, clientes, lista de espera; sentar, liberar, bloquear mesa para el servicio. No puede escribir `distribucion`, `mesa`, `combinacion`, `elemento_fijo`, `turno`, `configuracion`, `plato`, `contenido`, `usuario`. |
| `encargado` | Todo salvo `usuario` y los campos legales de `configuracion`. |
| `administrador` | Todo. |

Funciones auxiliares: `rol_actual()`, `es_personal()`, `puede_editar_sala()`, `es_admin()`.

## 3. Motor de disponibilidad (etapa 3)

Funciones SQL (todas `security definer`, `set search_path = public`):

| Función | Qué hace |
|---|---|
| `duracion_para(comensales)` | 105 o 135 min según configuración. |
| `distribucion_activa(zona, fecha, turno)` | Resuelve la plantilla vigente según la programación. |
| `candidatos(zona, inicio, comensales, online)` | Mesas y combinaciones de la distribución activa que admiten ese número, ordenadas por ajuste (capacidad máxima ascendente, primero mesas sueltas, después combinaciones). Excluye no reservables online si `online`. |
| `mesa_libre(mesa, intervalo)` | Sin asignación activa solapada, sin retención vigente, sin bloqueo, y sin ocupación real prolongada (una reserva sentada que supera su fin cuenta como ocupada hasta `now() + margen`). |
| `horas_disponibles(fecha, comensales, zona?)` | Para cada turno del día, genera horas cada `intervalo_min` desde `inicio` hasta `ultima_hora`; descarta las que incumplen antelación, bloqueos o el tope por franja; para cada hora y zona busca un candidato libre. Devuelve `(hora, turno, zonas_libres[], completa)`. Las completas se devuelven marcadas para mostrarlas tachadas. |
| `dias_disponibles(desde, hasta, comensales)` | Para el calendario: estado de cada día (cerrado, completo, con hueco). |
| `retener_mesa(inicio, comensales, zona?)` | Borra retenciones caducadas, elige el mejor candidato libre e inserta la retención (5 min). Si la exclusión salta por concurrencia, prueba el siguiente candidato. Devuelve `token`. |
| `confirmar_reserva(token, datos jsonb)` | En una transacción: revalida reglas, upsert del cliente por teléfono, inserta reserva, asignaciones (con margen) y encargos, borra la retención. Si la restricción salta devuelve `{ok:false, alternativas:[3 horas más cercanas]}`. |
| `crear_reserva_personal(datos, forzar)` | Alta desde el panel; con `forzar` ignora reglas (no la restricción física) y deja registro. |
| `asignar_reserva(reserva, mesas[], forzar)` / `mover_reserva(...)` | Cambia la asignación comprobando conflictos y devolviendo el motivo si no cabe. |
| `cambiar_estado(reserva, estado)` | Sentar, finalizar (recorta el intervalo a `now()`), cancelar y no presentada (desactiva asignaciones). |
| `reorganizar_turno(fecha, turno, aplicar)` | Recoloca las no sentadas por ajuste; con `aplicar = false` devuelve la vista previa. |
| `previsualizar_publicacion(distribucion)` / `publicar_distribucion(distribucion, aceptar)` | Comprueba reservas futuras afectadas: mantiene, reasignada o sin sitio. No publica si hay alguna sin sitio. |
| `buscar_por_codigo`, `modificar_por_codigo`, `cancelar_por_codigo` | Gestión del cliente con su enlace personal. |
| `tick()` | Tareas periódicas: caduca retenciones, marca `sin_confirmar` y devuelve recordatorios pendientes. |

Pruebas (Vitest contra la base local, cada prueba en una transacción revertida o con
datos aislados por fecha): una prueba por fila de la tabla de reglas + concurrencia con dos
conexiones simultáneas que confirman sobre la última mesa (solo una gana).

## 4. Reserva pública (etapa 4)

Ruta `/[locale]/reservar`, cliente en React con estado por pasos y transiciones:

1. **Comensales y fecha** — selector 1–10 y enlace «Más de 10: solicitud de grupo» (crea
   reserva `pendiente`); calendario con días cerrados o completos desactivados.
2. **Hora** — agrupadas en comida y cena; completas tachadas con «Avísame si se libera».
3. **Zona** — solo si ambas tienen hueco a esa hora.
4. **Tu arroz** — opcional; solo arroces cuyo mínimo de comensales ≤ grupo.
5. **Datos** — nombre, teléfono, correo, alergias, ocasión, trona, silla de ruedas,
   privacidad obligatoria y comercial separada. Turnstile. Al entrar a este paso se crea la
   retención y se muestra la cuenta atrás de 5 min.
6. **Confirmación** — resumen, archivo `.ics`, enlace de gestión, correo.

Página `/[locale]/reservar/gestion/[codigo]`: ver, modificar (comensales, hora, arroz) y
cancelar hasta 3 h antes; después, muestra el teléfono.

## 5. Acceso y estructura del panel (etapa 5)

- `/panel/acceso` (correo y contraseña), cambio obligatorio de contraseña en el primer acceso.
- `proxy.ts` (antes `middleware.ts`) refresca la sesión y protege `/panel`.
- Navegación lateral en tableta y escritorio, inferior en móvil; el panel abre en «Servicio de hoy».
- Registro de cambios consultable por administrador y encargado.
- Prueba: cada rol, con su JWT, intenta operaciones prohibidas directamente contra PostgREST y falla.

## 6. Reservas en el panel (etapa 6)

- **Servicio de hoy**: selector de turno, contadores (esperados, sentados, libres), lista de
  reservas y mapa en vivo lado a lado (apilados en vertical).
- **Reservas**: búsqueda, filtros, vista lista y línea de tiempo por mesa (filas = mesas,
  columnas = horas, barras = reservas).
- **Nueva reserva rápida**: tres toques (personas, hora, nombre; teléfono opcional), el
  sistema propone mesa. «Cliente sin reserva» crea reserva `puerta` ya `sentada`.
- **Tiempo real**: canal Supabase Realtime sobre `reserva` y `asignacion`; el panel refresca
  sus datos al recibir cambios. Indicador de conexión y modo lectura sin red.
- **Avisos**: toast con sonido opcional para reservas nuevas, modificadas o canceladas;
  alergias y accesibilidad resaltadas; aviso de conflicto 15 min antes; retraso > 15 min.

## 7. Mapa de mesas: edición (etapa 7)

Konva con `react-konva`, cargado solo en cliente (`dynamic(..., { ssr: false })`):
pestañas por zona, rejilla con ajuste, mesas (redonda, cuadrada, rectangular) con
transformador para girar y redimensionar, duplicar, borrar, sillas +/−, tronas y plazas
para silla de ruedas, combinaciones, elementos fijos, plantillas con programación,
deshacer/rehacer (pila de estados), autoguardado del borrador y «Publicar» con la vista
previa de conflictos.

## 8. Mapa de mesas: servicio (etapa 8)

Misma capa de dibujo en modo solo lectura de la distribución: colores + icono por estado
(libre, próxima, ocupada, a punto de terminar, pasada de tiempo, bloqueada), datos en la
mesa, arrastrar desde la lista hasta la mesa (mesas válidas resaltadas, las no válidas
atenuadas con motivo), mover reservas entre mesas con aviso de choque, «Reorganizar
turno» con vista previa, acciones de un toque y deslizador de hora. Objetivos táctiles ≥ 44 px.

## 9. Web pública (etapa 9)

- Portada «Del fuego al socarrat» como SVG generado en código y animado con GSAP
  ScrollTrigger + Lenis, cinco escenas en ~4 pantallas, carga diferida tras el primer
  pintado. `prefers-reduced-motion` o `Save-Data` → secuencia estática de cinco viñetas.
- Secciones: arroces (carrusel de paellas cenitales), para empezar, el producto (mapa
  ilustrado que se dibuja), la casa, carta completa, opiniones, cómo llegar.
- Botón «Reservar mesa» fijo abajo en móvil y en la cabecera en escritorio, con
  disponibilidad real («Quedan 3 mesas para el domingo a mediodía») solo cuando es cierto.
- Detalles: cursor de cuchara en escritorio, sonido opcional desactivado, términos en
  valenciano con traducción al pasar, páginas SEO, datos estructurados `Restaurant`,
  `Menu` y `ReserveAction`, `sitemap.xml` y `hreflang`.

## 10. Contenidos y configuración (etapa 10)

Carta (platos, precios, alérgenos, visibilidad), textos de la web por idioma, datos del
local, horarios y turnos, reglas de disponibilidad, bloqueos, plantillas de mensajes,
usuarios y roles (solo administrador). Cada guardado revalida las páginas públicas.

## 11. Recordatorios y cierre (etapa 11)

- `worker.ts` propio que reexporta el manejador de OpenNext y añade `scheduled()` para el
  Cron Trigger (`*/5 * * * *`), que llama a `/api/cron/tick` con `CRON_SECRET`.
- Recordatorio 24 h antes con enlaces «Confirmo» y «Cancelar»; sin respuesta → marca
  «sin confirmar» a las 4 h del servicio; agradecimiento al día siguiente con enlace de reseña.
- Textos legales de plantilla (aviso legal, privacidad, cookies) marcados para revisión.
- Auditoría de accesibilidad con axe en Playwright; Lighthouse de la portada en móvil.
- Los diez criterios de aceptación como pruebas automatizadas (`tests/e2e/aceptacion.spec.ts`
  y `lib/availability/*.test.ts`).

## 12. Entorno de desarrollo y verificación

| Comando | Qué hace |
|---|---|
| `pnpm db:start` | Arranca Supabase en Docker |
| `pnpm db:reset` | Aplica migraciones y semilla |
| `pnpm dev` | Next.js en local |
| `pnpm test` | Vitest (motor, utilidades) |
| `pnpm test:e2e` | Playwright (móvil y tableta) |
| `pnpm preview` | Build de OpenNext y `wrangler dev` (simula Workers) |
| `pnpm deploy` | Despliegue a Cloudflare (requiere credenciales) |

Integración continua (`.github/workflows/ci.yml`): lint, typecheck, Vitest con Supabase
en Docker, Playwright y build de OpenNext; despliegue desde `main` cuando existan los
secretos de Cloudflare.

## 13. Orden de trabajo y commits

Una rama de trabajo; un commit por etapa con su verificación pasada y el `README.md`
actualizado. Las dudas para el restaurante y para el propietario del proyecto se recogen
en `docs/DUDAS.md` y en `docs/PENDIENTES.md` (datos reales a sustituir).
