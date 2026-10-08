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
