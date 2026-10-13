# Bitácora del trabajo autónomo

Memoria entre sesiones. Al arrancar o reanudar: leer el **Resumen** y el **Siguiente paso**,
y seguir desde ahí. Nunca se escriben aquí valores secretos.

## Lista única de pendientes (13/10)

Sale de este diario (incluida E4, revisión de defectos), de `docs/DUDAS.md` y de
`docs/PENDIENTES.md`, más un recorrido de la web como cliente en el móvil y del panel como
camarero en la tableta, hecho con las capturas de `scripts/vista-previa/capturas.mjs`.
Estados: **hecho**, **en curso**, **pendiente**, **bloqueado**. Orden: impacto para el
cliente y la sala.

### Lo hago yo

| # | Tarea | Para quién | Estado |
|---|---|---|---|
| P1 | Reserva: el contador «Paso X de Y» cambia de total a mitad del flujo (de 5 a 6 si aparece la zona) y la confirmación cuenta como un paso más | Cliente | hecho (#23) |
| P2 | Reserva: al confirmar, la cabecera fija tapa el principio de la tarjeta de «¡Mesa reservada!» | Cliente | hecho (#23) |
| P3 | Panel: fechas y números en español correcto («13 De Octubre» en mayúsculas, fechas ISO `2026-10-13`, decimales con punto, «Telefono» sin tilde) en reservas, detalle, hoja e informes | Sala | hecho (#24) |
| P4 | Portada en escritorio: el titular deja «sí.» solo en la segunda línea | Cliente | hecho (#25) |
| P5 | Datos de ejemplo: fecha de creación realista en las reservas de la semilla (la «antelación media» de informes sale negativa) | Encargado | hecho (#26) |
| P6 | Galería de capturas en `docs/vista-previa/` (móvil, tableta y escritorio; tres idiomas; panel) | Propietario | hecho (#27) |
| P7 | Vista navegable gratis en GitHub Pages a partir de la rama `vista-estatica` | Propietario | hecho (#28); falta activar Pages (propietario) |
| P8 | Cerrar en `docs/DUDAS.md` las decisiones «a confirmar» que no dependen del restaurante | Propietario | hecho |
| P9 | Capturas y Lighthouse contra producción | Propietario | bloqueado: despliegue (B-1) |
| P10 | Etiqueta «Paso a cocina» del mapa cortada y casi invisible (elemento estrecho en la pared) | Sala | hecho (#29) |
| P11 | Editor del mapa en tableta vertical: el lienzo desborda a lo ancho y corta el zoom y la ayuda | Encargado | hecho (#30) |
| P12 | SQL de la vista previa de Vercel desfasado (le faltaban 3 migraciones) y guía que apuntaba a la rama `fase-1` | Propietario | hecho (#32) |
| P13 | Habilidades de diseño para Claude Code en el repositorio (impeccable y Emil Kowalski) | Propietario | hecho (#34) |
| P14 | Rediseño de la web pública y de la reserva (estética Emil Kowalski, Motion, modo claro y oscuro) | Cliente | hecho (#35) |

### Necesita al restaurante (datos reales)

Dirección, teléfono, horarios y vacaciones; plano real y mesas que se juntan (y con él,
las reservas online de 9 y 10 personas); carta con precios y alérgenos; titular de la
portada; historia y textos de la casa; fotos y logotipo en vector; reseñas reales; textos
legales revisados; revisión nativa del valenciano; usuarios reales del personal; ficha de
Google Business; cierre real de cocina (último turno); si usan otro sistema de reservas o
TPV. Detalle en `docs/PENDIENTES.md` y `docs/DUDAS.md`, sección 2.

### Tiene coste (fuera mientras el coste sea 0 €)

Avisos por WhatsApp o SMS; garantía con tarjeta para grupos; dominio propio (y con él,
verificar el remitente de Resend); sesión de fotos profesional.

### Necesita al propietario

Secretos de producción en GitHub (en curso por el propietario el 13/10) y primer
despliegue; variables del proyecto `yerga-rest` de Vercel si se quiere esa vista previa;
activar GitHub Pages: Settings → Pages → Source: «GitHub Actions» (ver P7; el flujo ya corre y solo falta ese paso).

## Resumen (actualizado al final de cada bloque y de cada sesión)

**Estado:** sesión 2 (13 de octubre de 2026).
- Terminado en código todo lo que no depende del restaurante, de pagar ni de los secretos de producción.
- El despliegue sigue esperando a que el propietario termine de cargar los secretos (B-1).

**Vistas previas**
- Galería de capturas (móvil, tableta y escritorio; web en tres idiomas, reserva paso a paso y panel):
  - en el repositorio: [`docs/vista-previa/index.html`](vista-previa/index.html); GitHub la muestra como código, así que hay que abrirla en una copia local o en Pages;
  - publicada: https://robybaltaretu.github.io/Yerga-rest/galeria/ (cuando Pages esté activado).
- Vista navegable estática: https://robybaltaretu.github.io/Yerga-rest/
  - Se publica sola en cada push a `main` en cuanto el propietario active Pages (ver abajo).

**Hecho en la sesión 2 (PR fusionados en `main`)**
- #21: B-2 resuelto (ramas remotas borradas).
- #22: lista única de pendientes y dudas «a confirmar» cerradas.
- #23: contador de pasos estable y confirmación visible bajo la cabecera (P1, P2).
- #24: fechas, números y orígenes del panel en español correcto (P3).
- #25: titular de la portada equilibrado en dos líneas (P4).
- #26: fechas de creación realistas en la semilla; la «antelación media» ya no sale negativa (P5).
- #27: galería de capturas y sus scripts (P6).
- #28: vista navegable en GitHub Pages; sustituye a la rama `vista-estatica` (P7).
- #29: etiqueta legible del paso a cocina en el mapa (P10).
- #30: el editor del mapa cabe en una tableta vertical y en el móvil (P11).
- #31: este resumen y la galería regenerada con P10 y P11.

**Hecho en la sesión 1:** #3 a #20 (bloques A, C, D y E). Detalle en el diario.

**Pendiente (mío)**
- P9: capturas y Lighthouse contra producción cuando https://arroceria-yerga.roberto-baltaretu.workers.dev/es responda 200:
  - `CAPTURAS_URL=<url> node scripts/vista-previa/capturas.mjs`;
  - después, `node scripts/vista-previa/galeria.mjs`, y PR.
  - Desde esta sesión en la nube no se puede: el proxy bloquea `workers.dev`. Se hará en la siguiente sesión que tenga acceso, o lo lanza el propietario con esos dos comandos.
- E4: seguir buscando defectos en cada recorrido.

**Necesita al restaurante:** ver «Necesita al restaurante» al principio (carta, plano, fotos, textos legales, dirección…).

**Tiene coste (fuera):** WhatsApp o SMS, garantía con tarjeta, dominio propio, fotos profesionales.

**Necesita al propietario**
1. Terminar de cargar los secretos y variables de producción en GitHub (B-1).
   - El siguiente push a `main`, o Actions → CI → Run workflow, despliega.
2. Activar GitHub Pages, una sola vez:
   - Settings → Pages → Build and deployment → Source: **GitHub Actions**;
   - después, Actions → «Vista previa (GitHub Pages)» → Run workflow.
3. Opcional: variables de Supabase en el proyecto `yerga-rest` de Vercel, si se quiere también esa vista previa.

**Siguiente paso exacto:** cuando producción responda 200, P9 (capturas de producción y Lighthouse).

## Bloqueos

### B-1. Esta sesión corre en la nube, no en tu ordenador

`docs/INFRA-COSTE-CERO.md` (0.1) ya lo preveía: la parte de secretos debe ejecutarse en tu
equipo. Comprobado en esta sesión:

- `~/yerga-secrets.txt` no existe en el contenedor de la nube (es tu archivo local).
- La red del contenedor rechaza `api.cloudflare.com`, `api.supabase.com`, `api.resend.com`
  y `*.workers.dev` (el proxy deniega la conexión por política).
- GitHub: el proxy no permite leer ni escribir secretos, variables, entornos ni la
  protección de ramas (HTTP 403). Sí permite ramas, pull requests y fusiones.

Afecta a A1, A2, la parte de configuración de A4, B1–B4, la clave privada de C3, C4 y la
medición en producción de D2. Todo lo demás (código, flujos de CI, scripts y
documentación) lo dejo hecho para que el despliegue funcione en cuanto estén los secretos.

**Qué necesito de ti:** ejecutar en tu ordenador `scripts/infra/configurar-secretos.sh`
con `~/yerga-secrets.txt` presente, o abrir una sesión de
Claude Code en tu terminal y pedirle que siga esta bitácora. Alternativa en la nube:
añadir esos dominios a «Allowed domains» del entorno y darme las credenciales como
variables del entorno.

### B-2. No puedo borrar ramas remotas — **resuelto el 13/10**

Resuelto: el 13 de octubre se borraron desde la web de GitHub las 19 ramas con PR
fusionado. Quedan `main`, `fase-1` (posible rama de producción del proyecto de Vercel; no
se toca hasta confirmarlo) y `vista-estatica` (sin PR fusionado).

El proxy de la sesión corta `git push --delete`, y la herramienta de GitHub no tiene
borrado de ramas. Las ramas fusionadas quedan en el remoto. **Solución sin coste:**
Settings → General → «Automatically delete head branches». Las ya fusionadas se pueden
borrar desde la pestaña Branches.

## Decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 08/10 | Fusiono el PR #3 aunque «verificar» estaba en rojo | Pedido explícito; solo documentación. El fallo era una prueba dependiente de la hora, presente ya en `main` |
| 08/10 | Contenido de ejemplo como migración idempotente, no como semilla aparte | `db push` la aplica sola en el primer despliegue y no pisa datos reales (solo actúa con la base vacía). Evita depender de la URL del pooler para ejecutar SQL desde la CI |
| 08/10 | El administrador entra la primera vez por «¿Has olvidado tu contraseña?» | Así ninguna contraseña inicial pasa por la CI (sus registros son públicos), el chat ni el repositorio. De paso, el panel gana recuperación de contraseña |
| 08/10 | `ADMIN_EMAIL` como variable de GitHub, no escrito en el repositorio | El repositorio es público: no publico tu correo |
| 08/10 | Los secretos del Worker los carga la CI en cada despliegue | No hace falta ningún paso manual con `wrangler secret`; siempre coinciden con GitHub |
| 08/10 | Token `yerga-deploy` sin R2 y con D1, KV y lectura de analítica | R2 pide tarjeta; D1 y KV hacen falta para la revalidación (C1); la analítica, para medir la CPU (C4) |
| 08/10 | Web Analytics solo en la web pública | El panel es interno; no aporta medir al personal |
| 08/10 | Verificación automática tras cada despliegue (`scripts/produccion/verificar.mjs`) | Cumple «tras cada despliegue verifica la URL» aunque yo no tenga red hacia workers.dev |

## Diario

### 13/10 · Limpieza de ramas
- Borradas en GitHub las 19 ramas remotas cuyo PR estaba fusionado (B-2 resuelto).
- Se conservan `main`, `fase-1` y `vista-estatica`.
- B-1 sigue abierto: el despliegue requiere ejecutar `scripts/infra/configurar-secretos.sh`
  en el ordenador del propietario.

### 08/10 · Arranque
- Fusionado el PR #3 (squash). Leídos los documentos en el orden pedido.
- CI roja en `main`: `mapa-servicio.spec.ts` › «el deslizador…» falla cuando la CI corre
  después del turno (el deslizador ya está en el máximo y «ArrowRight» no lo mueve).
  Reproducido en local a las 22:17 y arreglado: la prueba pulsa «Inicio» antes de avanzar.
- **Siguiente paso:** fusionar `fix/prueba-deslizador-hora` con la CI en verde; después,
  bloque A desde A3.

### 08/10 · Bloque A (rama `infra/despliegue-produccion`)
- PR #4 fusionado con la CI en verde.
- A3: `wrangler.jsonc` → `arroceria-yerga` (name y service) y `NEXT_PUBLIC_SITE_URL` en `vars`.
- A4: job `desplegar` con secretos y variables separados, comprobación de que no falta
  ninguno (si falta, aviso y no despliega), `workflow_dispatch` para relanzarlo.
- A5: paso `supabase link` + `supabase db push --yes`. Nunca `db reset`.
- A6: migración `20261009000900_contenido_inicial.sql`, `seed.sql` solo con demostración,
  `scripts/produccion/crear-admin.mjs` (probado en local: crea y, la segunda vez, no hace
  nada) y recuperación de contraseña con prueba e2e (correo leído de Mailpit).
- A7: `components/Analitica.tsx`, solo con `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (producción).
- A2: `scripts/infra/configurar-secretos.sh`, con rutas de API comprobadas en las
  especificaciones OpenAPI oficiales de Supabase, Cloudflare y Resend (descargadas de
  GitHub, porque las API no son accesibles desde aquí). **No ejecutado: bloqueo B-1.**
- Verificado en local: lint, tipos, Vitest 37/37, Playwright completo y `verificar.mjs`
  contra el build local.
- **Siguiente paso:** PR del bloque A con la CI en verde; después, bloque C (C1).

### 08/10 · C1: web pública prerenderizada (rama `perf/web-publica-prerenderizada`)
- PR #5 (bloque A) fusionado con la CI en verde.
- Quitado `force-dynamic` del layout público y añadidos `generateStaticParams` a las
  páginas legales. El build prerenderiza las 24 páginas públicas (8 por idioma); solo
  `/reservar` y `/reservar/gestion/[codigo]` siguen dinámicas. `/api/disponibilidad`
  sigue con `no-store`.
- `open-next.config.ts`: caché incremental en **KV**, etiquetas en **D1** y cola en
  memoria. Sin R2. Sin los bindings (local, CI) todo se renderiza en cada petición.
- `scripts/produccion/recursos-cloudflare.mjs` crea (o encuentra) el KV
  `arroceria-yerga-cache` y la D1 `arroceria-yerga-etiquetas`, y añade sus ID a
  `wrangler.jsonc` solo en la copia de la CI. Comprobado con `wrangler deploy --dry-run`
  que los bindings se reconocen.
- `cf:deploy` pasa a `opennextjs-cloudflare deploy`, que llena la caché y crea la tabla de
  etiquetas antes de desplegar.
- La revalidación ya existía: cada guardado de carta, textos, configuración, turnos o
  bloqueos llama a `revalidatePath("/", "layout")`. La prueba «un cambio de precio se ve
  en la web al momento» pasa con las páginas ya estáticas.
- Tamaño del Worker sin cambios: 5,1 MB comprimido (`wrangler deploy --dry-run`).
- **Riesgo anotado:** KV gratuito permite 1000 escrituras al día. Cada despliegue escribe
  unas 50 entradas (páginas y sus RSC), así que el margen es amplio.
- **Siguiente paso:** PR de C1; después, C2 (panel como aplicación de navegador).

### 08/10 · C2: panel como aplicación de navegador (rama `perf/panel-en-navegador`)
- PR #6 (C1) fusionado con la CI en verde.
- `components/panel/DatosPanel.tsx`: `ProveedorSesion` (usuario y rol desde el navegador;
  sin sesión vuelve al acceso), `useDatos` (consulta con el cliente del navegador y se
  repite al recargar), `ProveedorRecarga`/`useRecargar` (Tiempo Real y las acciones piden
  datos frescos), `RequiereRol` y utilidades.
- `lib/panel/datos.ts` ya no es solo de servidor: cada consulta recibe el cliente.
- Las 16 pantallas del panel pasan a `page.tsx` (metadatos y `Suspense`) + `vista.tsx`
  (cliente). El layout ya no lee nada en el servidor. Resultado del build: 13 pantallas
  estáticas (○); las de `[id]`, `acceso` y `clave` siguen dinámicas, pero sin consultas.
- `router.refresh()` tras las acciones pasa a `recargar()` en 7 componentes.
- Comprobación de rol: la interfaz redirige (`RequiereRol`), pero el permiso real sigue
  en RLS (sin cambios en la base).
- Verificado: tipos, lint, Vitest y Playwright completo (33 pasan).
- **Pendiente de medir en producción (C4):** CPU por petición. Bloqueado por B-1.
- **Siguiente paso:** PR de C2; después, C3 (copias de seguridad).

### 08/10 · C3: copias de seguridad (rama `ops/copias-seguridad`)
- No puedo crear repositorios desde esta sesión (la API de GitHub devuelve 403 al crear
  `yerga-backups`). **Decisión:** dejar la plantilla en `infra/yerga-backups/` (flujo
  diario, README de restauración y `vaciar.sql`) y que `configurar-secretos.sh` cree el
  repositorio privado, genere la clave age en `~/yerga-backup-key.txt` (solo en tu
  ordenador) y cargue `SUPABASE_DB_URL` y `AGE_RECIPIENT`.
- Método: `supabase db dump --data-only -s public,auth` → tar.gz → `age`. El esquema no se
  copia: lo reconstruyen las migraciones.
- **Restauración probada en local de principio a fin:**
  - volcado de la base con datos de demostración más un dato propio;
  - `db reset --no-seed` (base nueva solo con migraciones);
  - descifrado y carga con `vaciar.sql` y `session_replication_role = replica`;
  - resultado: 29 reservas, 3 usuarios, el dato propio y las secuencias, y el inicio de
    sesión con un usuario restaurado (200).
  - Descartado el método de tres archivos de la guía de Supabase: `roles.sql` falla como
    `postgres` y los datos de `storage` no se pueden escribir.
- Retención de 30 días probada con fechas simuladas.
- La conexión usa el pooler en modo sesión (puerto 5432); el host y el usuario se leen
  de la Management API (`/config/database/pooler`, comprobada en la especificación).

### 08/10 · D3: revisión de seguridad (rama `sec/revision-seguridad`)
- `tests/unit/rls-matriz.test.ts`: matriz tabla × rol × operación con `select`, `update`
  y `delete` reales (24 tablas × 4 roles × 3 operaciones, en transacciones que se
  deshacen). Coincide con las políticas a la primera. Comprobé que la prueba falla si se
  cambia una expectativa.
- También fija qué RPC ejecuta el anónimo (solo las cinco auxiliares de rol) y qué
  funciones `security definer` del personal no comprueban el rol: seis de solo lectura,
  riesgo aceptado y anotado.
- Cabeceras de seguridad y CSP en `next.config.ts`; `tests/e2e/seguridad.spec.ts`
  comprueba las cabeceras y que la web y el panel no incumplen la CSP.
- `scripts/seguridad/sin-secretos.mjs` en la CI (tras el build) y antes de cada
  despliegue. Probado con una clave plantada.
- Historial de git revisado en todas las ramas: sin secretos (solo la clave anónima
  pública de demostración de Supabase local en `vista-estatica`).
- Resumen en `docs/SEGURIDAD.md`.
- Verificado: lint, tipos, Vitest (65) y Playwright (36 pasan).
- **Siguiente paso:** PR de D3 cuando se fusione el #8; después, D1 (criterios),
  D2 (accesibilidad) y D4 (idiomas).

### 08/10 · D1, D2 y D4 (rama `test/criterios-aceptacion`)
- **D1:** los diez criterios tienen prueba y todas existen con el nombre de
  `docs/ACEPTACION.md`. El criterio 9 pasa a ser automático:
  `tests/e2e/rendimiento.spec.ts` mide el LCP de la portada con 4G lenta y CPU ×4
  (mediana de 3). En local: 1816, 1852 y 1856 ms; mediana 1852 ms (< 2500).
- **D2:** la auditoría axe pasa de 5 a 11 páginas públicas (tres idiomas, legales,
  calendario) y de 7 a 18 pantallas del panel (también detalles, editor de mapa, registro
  y usuarios). Un único error grave: contraste del botón «Sonido» del panel, que tenía el
  fondo translúcido. Arreglado con fondo sólido. Lighthouse en producción: bloqueado (B-1).
- **D4:** sin claves de traducción que falten. Los textos que coinciden con el castellano
  son correctos (Hora, Carta, Gluten…). Los postres no tienen descripción en ningún
  idioma, a propósito. Rastreo de las 27 páginas: sin enlaces rotos. Arreglado:
  - las portadas no declaraban `hreflang`;
  - las páginas legales heredaban un `hreflang` que apuntaba a las portadas y no tenían
    `canonical`;
  - la reserva no tenía `canonical`;
  - faltaba `x-default`;
  - el sitemap solo listaba las 9 URL en castellano.

  Ahora `lib/seo.ts` lo genera todo, el sitemap tiene 27 URL y hay una prueba que lo
  vigila.
- **Siguiente paso:** PR de D1, D2 y D4 cuando se fusione el #9; después, bloque E.
### 09/10 · E1: dudas resueltas (rama `docs/dudas-decididas`)
- `docs/DUDAS.md` reescrito. Las decisiones sin coste van marcadas «decidido por Code, a
  confirmar»:
  - LCP dado por bueno, con prueba automática;
  - lista de espera con plazo de 15 min en la fase 1;
  - clientes, arroces e informes se quedan en la fase 1;
  - máximo online de 10, con combinaciones mayores definibles en el panel;
  - el cierre del turno es el cierre de cocina.
- Las de pago (plan de Workers y de Supabase) las decidió el propietario: gratuito.
- Las preguntas para el restaurante siguen abiertas: son datos reales.
- **Siguiente paso:** E3, lista de espera con plazo de 15 minutos.
### 09/10 · E4: contraste de la etiqueta «reconfirmada» (rama `fix/contraste-huerta`)
- **Defecto:** en el panel, la etiqueta verde de las reservas reconfirmadas (`text-huerta`
  sobre `bg-huerta-claro`) tenía un contraste de 4,48:1, por debajo del mínimo de 4,5:1.
  Solo aparece cuando hay reservas reconfirmadas, así que la auditoría axe fallaba o no
  según los datos de la base local.
- **Arreglo:** `--color-huerta` pasa de `#66683a` a `#55572f` (5,79:1). Afecta a todos
  los avisos de «guardado» del panel, que usan la misma pareja de colores. Las
  ilustraciones de la web conservan el tono original, porque son decorativas.
### 09/10 · E4: interbloqueo al reservar la última mesa (rama `fix/bloqueo-retener-mesa`)
- **Defecto:** la CI del #13 falló en la prueba «dos personas reservan la última mesa a
  la vez» con `deadlock detected`. Dos inserciones simultáneas que chocan en una
  restricción de exclusión (`retencion_sin_solape`, `asignacion_sin_solape`) pueden
  esperarse la una a la otra. PostgreSQL aborta entonces una, y ese cliente recibía un
  error en vez de las horas alternativas.
  - Reproducido en local: 46 interbloqueos en 400 pares simultáneos.
- **Arreglo:** migración `20261009000950_serializar_ocupacion.sql`. Antes de ocupar una
  mesa (retención o asignación activa) se toma `pg_advisory_xact_lock` por día de
  servicio. La segunda transacción espera a la primera y recibe una violación de
  exclusión limpia, que `retener_mesa` ya trata: prueba otra mesa o devuelve
  alternativas.
  - Con el arreglo: 0 interbloqueos en 400 pares.
  - El coste es irrelevante: un restaurante no tiene reservas simultáneas en volumen.
- **Prueba nueva:** `tests/unit/concurrencia.test.ts`, 150 pares simultáneos y ningún
  interbloqueo. Sin el arreglo falla (26 interbloqueos).
### 09/10 · Build de Vercel roto (rama `fix/build-sin-supabase`)
- **Síntoma:** desde el PR #6 (C1, web prerenderizada) los despliegues de vista previa del
  proyecto `yerga-rest` en Vercel fallan con `Command "pnpm build" exited with 1`.
- **Causa:** al prerenderizar, `next build` lee la configuración, la carta y los textos
  de Supabase. Vercel no tiene las variables de Supabase: el cliente no se puede crear y
  `getConfig` devolvía `null` con `data!`, lo que rompía el build. Reproducido en local
  compilando sin las variables. No he podido leer los registros de Vercel (la conexión
  no tiene permiso sobre ese equipo), pero el fallo es el mismo.
- **Arreglo:** `lib/datos-publicos.ts` pasa todas las lecturas por `consultar()`. Si
  Supabase falla o no está configurado, llama a `connection()`: la página sale del
  prerenderizado y se renderiza en cada petición, en vez de romper el build. Si falla
  también en la petición, lanza el error, porque antes las listas vacías lo ocultaban.
  - Sin variables: el build termina y las páginas públicas quedan dinámicas.
  - Con Supabase: siguen prerenderizadas, igual que antes.
- **Para ver contenido en Vercel** hay que añadir `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` al proyecto. Sin ellas, la web compila pero las
  páginas públicas darán error. El despliegue de referencia sigue siendo Cloudflare.
- **Defecto visto de paso (E4):** con reservas reconfirmadas, la etiqueta verde del panel
  tiene un contraste de 4,48:1, por debajo de 4,5. Va en su propio PR.
### 09/10 · E3.1: lista de espera con plazo de 15 minutos (rama `feat/lista-espera-15-minutos`)
- Migración `20261009001000_lista_espera_plazo.sql`:
  - `configuracion.espera_plazo_min` (15 por defecto, editable en el panel);
  - columnas de oferta en `lista_espera`;
  - `avisar_lista_espera` ahora **retiene** la mesa durante el plazo: primero la hora
    liberada y, si no cabe, la libre más cercana a la que pidió;
  - nuevas `oferta_espera`, `aceptar_oferta_espera` (atómica e idempotente) y
    `caducar_ofertas_espera`;
  - textos del correo con plazo y enlace; solo se cambian si la plantilla sigue siendo
    la original.
- Página `/[locale]/reservar/espera/[token]` en los tres idiomas: aceptar con un toque,
  oferta caducada u oferta ya aceptada.
- La tarea periódica (`/api/cron/tick`) caduca las ofertas sin respuesta y se las ofrece
  al siguiente.
- Panel: la lista muestra hasta qué hora está guardada la mesa y enlaza a la reserva.
- Pruebas: 2 de Vitest (aceptar con un toque; caducar y pasar al siguiente) y 2 e2e
  (cadena completa desde la cancelación del cliente hasta el correo y la aceptación;
  oferta caducada en valenciano).
- Fuera: aviso por WhatsApp o SMS (tiene coste).
### 09/10 · E3.2: fichas de cliente y RGPD (rama `feat/fichas-cliente`)
- **Ficha del cliente** (`/panel/clientes/[id]`), con un resumen arriba:
  - visitas, no presentadas, cancelaciones, comensales de media;
  - última visita y próxima reserva;
  - arroz favorito, sacado de sus encargos.

  Debajo, notas, preferencias y alergias editables por todo el personal, y el historial
  de reservas.
- **Derechos RGPD, solo para el administrador:**
  - *Exportar* (derecho de acceso): descarga un JSON con la ficha, las reservas con sus
    arroces, la lista de espera y los correos enviados;
  - *Anonimizar* (derecho de supresión): pide confirmación.
- **Defecto arreglado:** la anonimización por inactividad (24 meses) solo vaciaba la
  ficha. El nombre, el teléfono y el correo seguían en las reservas, en la lista de
  espera, en los correos y en el registro de cambios. Ahora `anonimizar_datos_cliente`
  lo limpia todo y la usan la tarea periódica y el botón. Las reservas se conservan sin
  datos personales para los informes.
- **Pruebas:**
  - Vitest: sala y encargado reciben 42501 al exportar o anonimizar; el administrador
    puede, y no queda rastro de los datos en ninguna tabla.
  - e2e: resumen de la ficha y exportación.
### 09/10 · E3.3: resumen de arroces para cocina (rama `feat/resumen-arroces`)
- `/panel/arroces` rehecho para cocina:
  - totales del servicio, de mayor a menor;
  - franjas de media hora, cada una con su subtotal y el detalle por mesa (alergias
    destacadas);
  - filtro por turno (comida, cena o todo el día) en la URL;
  - «Imprimir» imprime la propia página: el menú lateral y los botones se ocultan al
    imprimir.
- La lógica va en `lib/panel/arroces.ts`, pura, con pruebas de Vitest (franjas con
  horario de verano e invierno, cancelaciones excluidas, filtro por turno).
- Prueba e2e `tests/e2e/arroces.spec.ts`: tres reservas en dos turnos, totales,
  subtotales por franja y filtro.
### 09/10 · E3.4: informes con comparación y CSV (rama `feat/informes-csv`)
- Cada indicador se compara con el periodo anterior de la misma duración: «▲ 4,5 pts
  frente al anterior», en verde si mejora y en rojo si empeora. Las «confirmadas futuras
  sin mesa» no se comparan, porque son una foto de hoy.
- Nuevas tarjetas de reservas y comensales atendidos.
- Periodos rápidos: 7, 30 y 90 días, y este mes.
- Exportación a CSV para Excel en castellano (separador «;», BOM y CRLF):
  - reservas del periodo **sin datos de contacto** (minimización RGPD);
  - ocupación por turno.
- La lógica pura va en `lib/panel/informes.ts`, con Vitest (periodo anterior con cambio
  de hora, variación, comillas del CSV). Prueba e2e `tests/e2e/informes.spec.ts`:
  comparación y descarga, comprobando que el CSV no lleva nombre ni teléfono.
- Fuera: informes por correo programados (fase 3).
### 09/10 · E4: prueba de reserva dependiente de la hora (rama `fix/prueba-reserva-hora`)
- **Síntoma:** la CI del #19, que solo cambiaba documentación, falló en `reserva.spec.ts`.
  Tras reservar no aparecía «Cambiar día, hora o personas».
- **Causa:** la prueba reservaba el primer día libre a su primera hora. Corriendo a las
  10:06 de Madrid, eso era hoy a las 13:00, a menos de 3 horas. La web, con razón, ya no
  deja cambiar la reserva y muestra «fuera de plazo». No era un fallo de la aplicación.
- **Arreglo:** el calendario marca cada día con `data-fecha` y `elegirPrimerDiaLibre`
  elige siempre a partir de mañana. Reproducido en local a la misma hora: sin el
  arreglo falla; con él pasa.
### 13/10 · Sesión 2: lista única de pendientes (rama `docs/lista-pendientes`)
- Fusionado el #21 (B-2 resuelto).
- Recorrido con capturas: web pública como cliente en el móvil (tres idiomas, flujo de
  reserva completo) y panel como camarero en la tableta. Defectos encontrados: P1 a P5
  de la lista del principio.
- `docs/DUDAS.md`: cerradas las decisiones «a confirmar» que no dependen del restaurante
  (3, 4, 5 y las menores de la sección 4). La 6 y la 7 esperan al plano y al horario
  reales.
- **Decisión:** el botón «Confirmo que vamos» se sigue mostrando también justo después
  de reservar. Es redundante pero inofensivo, y quitarlo cambiaría el flujo del
  recordatorio. Se revisará con datos reales.

### 13/10 · P6: galería de capturas (rama `feat/galeria-vista-previa`)
- `scripts/vista-previa/capturas.mjs` recorre la app con Playwright a 375, 768 y 1440 px
  contra Supabase local y la semilla: web en `/es`, `/va` y `/en` (portada, arroces,
  carta, la casa, contacto y la reserva paso a paso hasta la página de gestión) y todo el
  panel (acceso, servicio de hoy con su mapa, reservas y línea de tiempo, mapa en edición,
  espera, clientes, arroces del día, informes, configuración, carta, usuarios, registro y
  hoja del turno). 201 capturas JPEG.
- `scripts/vista-previa/galeria.mjs` las junta en `docs/vista-previa/index.html` con
  índice por sección y botones por tamaño.
- **Decisión:** JPEG de calidad 72 (unos 17 MB en total) en vez de PNG (varias veces más).
  Las reservas y clientes que crea el recorrido se borran al terminar.
- Cuando producción responda, el mismo script con `CAPTURAS_URL=<url>` hace las capturas
  públicas en `docs/vista-previa/produccion/` y la galería las muestra arriba.

### 13/10 · P7: vista navegable en GitHub Pages (rama `feat/vista-pages`)
- La rama `vista-estatica` estaba desfasada (anterior al panel en el navegador y a la
  fase 2): no se puede actualizar sin rehacerla. **Decisión:** se sustituye por
  `scripts/vista-previa/estatica.mjs`, que guarda el HTML ya pintado de 59 páginas
  (web en tres idiomas y panel con reservas, clientes y mapas de la semilla), quita los
  scripts, reescribe las rutas bajo `/Yerga-rest/` y convierte el mapa (canvas) en
  imagen.
- `.github/workflows/vista-previa.yml` la genera con Supabase local en cada push a `main`
  (gratis, sin secretos), añade la galería en `/galeria/` y la publica con
  `deploy-pages`. En los PR que tocan la vista solo la genera.
- **Paso del propietario (único):** Settings → Pages → Build and deployment → Source:
  «GitHub Actions», y después Actions → «Vista previa (GitHub Pages)» → Run workflow.
  Mientras no se haga, el flujo genera el sitio, avisa y termina en verde.
- Direcciones cuando esté activo: https://robybaltaretu.github.io/Yerga-rest/ y
  https://robybaltaretu.github.io/Yerga-rest/galeria/.

### 13/10 · P10: etiquetas de elementos estrechos en el mapa (rama `fix/etiqueta-vertical`)
- Visto en las capturas: el paso a cocina (16 × 120 en la pared derecha) llevaba su
  etiqueta en horizontal, de 160 px, centrada encima. Quedaba en color claro sobre el
  suelo claro y cortada por el borde del lienzo.
- Ahora los elementos estrechos y altos llevan la etiqueta a lo largo, dentro del propio
  elemento. Los demás, igual que antes.

### 13/10 · P11: editor del mapa en tableta vertical (rama `fix/editor-mapa-ancho`)
- Visto en la galería a 768 px: el lienzo del editor medía 824 px y cortaba los botones
  de zoom y el texto de ayuda. Debajo de `lg` la rejilla tenía una columna implícita
  `auto`. El lienzo (800 px al arrancar) la ensanchaba y el observador de tamaño daba
  por buena esa anchura.
- Arreglo: `grid-cols-1` (columna `minmax(0, 1fr)`). Prueba nueva en Playwright a
  768 × 1024: falla sin el arreglo (824 > 768) y pasa con él. Las pruebas de tableta van
  en horizontal (más ancho que `lg`), por eso no lo veían.

### 13/10 · Cierre de la sesión 2 (rama `docs/resumen-sesion-2`)
- Galería regenerada con P10 y P11.
- El flujo «Vista previa (GitHub Pages)» corrió en `main` tras el #28: genera el sitio y
  omite la publicación porque Pages aún no está activado. Es el paso del propietario.
- **Decisión:** no se añaden entradas de lista de espera a la semilla. Retendrían mesas
  al cancelar reservas en otras pruebas y las harían depender unas de otras. La pantalla
  de espera sale vacía en la galería.
- P9 sigue bloqueado: desde la nube el proxy no deja llegar a `workers.dev` ni a
  `github.io`.

### 13/10 · P12: vista previa de Vercel (rama `fix/sql-vista-previa`)
- `supabase/vista-previa.sql` (el archivo que se pega en Supabase para la vista previa
  de Vercel) no incluía las migraciones `serializar_ocupacion`, `lista_espera_plazo` y
  `rgpd_clientes`. Regenerado con `scripts/sql-vista-previa.sh`. Probado entero sobre una
  base vacía: termina sin errores, con 27 reservas y 3 usuarios de ejemplo.
- Paso nuevo en la CI: falla si el archivo no coincide con las migraciones.
- `docs/VISTA-PREVIA.md`: la rama de producción de Vercel debe ser `main`, no `fase-1`.
  `fase-1` va 51 commits por detrás.

### 13/10 · P13: habilidades de diseño en el repositorio (rama `chore/habilidades-diseno`)
- A petición del propietario, copiadas en `.claude/` para que estén en cualquier sesión de
  este proyecto (nube u ordenador):
  - `.claude/skills/impeccable/` y `.claude/agents/impeccable-*.md`, de
    `pbakaus/impeccable` (commit `245ad82`, versión 4.5.2, Apache 2.0, con su LICENSE y
    NOTICE);
  - 14 habilidades de `emilkowalski/skills` (commit `2d22863`, MIT, con su LICENSE en
    cada carpeta).
- **Decisión:** sin los hooks de impeccable. Ejecutarían su binario en cada edición y al
  terminar cada turno, y lo descargarían de internet la primera vez. La habilidad
  funciona sin ellos; el binario solo se descarga si se usa un comando que lo necesite.
- **Decisión:** telemetría de impeccable desactivada para todo el proyecto
  (`.impeccable/config.json`).
- `.claude/` excluido del lint (es código de terceros).
- Para actualizar: volver a copiar `plugin/skills/impeccable` y `plugin/agents` del
  repositorio de impeccable, y `skills/*` del de Emil Kowalski.

### 13/10 · P14: rediseño de la web pública (rama `feat/rediseno-web`)
- Petición del propietario: estética Emil Kowalski (neutros, bordes de 1px casi
  invisibles, sombras multicapa, Geist con tracking ajustado), microinteracciones con
  Framer Motion (muelle 300/30, escala 0,98 al pulsar, brillo radial) y rigor de
  accesibilidad. Respuestas del propietario: alcance web pública + reserva (panel fuera),
  se conserva el logotipo y sale el resto de la identidad anterior, se añade `motion`.
- Hecho con la habilidad impeccable: `PRODUCT.md`, contrato de dirección en
  `.impeccable/surfaces/`, detector sin hallazgos y revisión final independiente.
- **Decisión:** el sistema vive bajo la clase `.web` del `<html>` de `app/[locale]`, con
  sus propios tokens (claro y oscuro según el sistema) y reasignando los antiguos, para
  que los componentes compartidos con el panel cambien en la web sin tocar el panel.
- **Decisión:** la portada abre con el primer paso real de la reserva («Mesa para − 2 +
  personas» → `/reservar?comensales=n`); la única nota de color es la paella. Sale la
  portada animada con el scroll (GSAP + Lenis desinstalados), el azulejo, la foto en
  sepia enmarcada, la caligrafía y los iconos de la casa.
- Accesibilidad: el gris terciario y el azafrán se oscurecieron hasta AA tras la
  auditoría con axe. Pruebas de la portada reescritas (control de personas y modo
  oscuro, comprobando que el panel no cambia).
