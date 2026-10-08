# Bitácora del trabajo autónomo

Memoria entre sesiones. Al arrancar o reanudar: leer el **Resumen** y el **Siguiente paso**,
y seguir desde ahí. Nunca se escriben aquí valores secretos.

## Resumen (actualizado al final de cada bloque y de cada sesión)

**Estado:** sesión 1 en curso (jueves 8 de octubre de 2026, noche).

**Hecho**
- PR #3 (documentación de coste cero) fusionado en `main`.
- PR #4: prueba del deslizador independiente de la hora (CI de `main` en verde).
- Bloque A (código): Worker `arroceria-yerga`, CI coherente, migraciones en el despliegue,
  contenido inicial idempotente, primer administrador, recuperación de contraseña,
  Web Analytics y script de secretos para tu ordenador.

**Pendiente**
- Bloques A–E según el encargo.

**Bloqueado: necesito de ti** (detalle en «Bloqueos»)
- Ejecutar la parte de secretos en tu ordenador (sección 0.1 de `docs/INFRA-COSTE-CERO.md`).

**Siguiente paso exacto:** ver la última entrada del diario.

**Para desbloquear el despliegue (tú, unos 5 minutos):** en tu ordenador, desde la raíz
del repositorio actualizado, con `~/yerga-secrets.txt` en su sitio:
`bash scripts/infra/configurar-secretos.sh`. Después, borra la clave temporal de Resend.

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

### B-2. No puedo borrar ramas remotas

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
