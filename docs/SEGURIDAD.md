# Revisión de seguridad (fase 1)

Revisión del 9 de octubre de 2026. Cada punto tiene una prueba automática que lo vigila en
la CI, salvo los marcados como riesgo aceptado.

## Permisos en la base de datos

- **RLS activado en las 24 tablas** de `public`, comprobado por
  `tests/unit/rls-matriz.test.ts`. La prueba falla si aparece una tabla nueva sin RLS o
  sin fila en la matriz.
- **Matriz completa tabla × rol × operación.** Se prueban `select`, `update` y `delete`
  reales con los roles anónimo, sala, encargado y administrador, dentro de transacciones
  que se deshacen. La matriz esperada está en la propia prueba y documenta quién puede
  qué. Puntos clave:
  - el anónimo solo lee contenido público, y de `configuracion` solo las columnas no
    internas;
  - las reservas no se borran (se cancelan); los clientes solo los borra el administrador;
  - el registro de cambios es inalterable y solo lo leen encargado y administrador;
  - los usuarios solo los gestiona el administrador.
- Las altas (`insert`) por rol las cubre `tests/unit/permisos.test.ts`.
- **Funciones (RPC):**
  - El anónimo solo puede ejecutar las cinco funciones auxiliares de rol. La reserva
    pública pasa siempre por el servidor, con la clave de servicio y Turnstile.
  - Las funciones `security definer` del personal comprueban el rol dentro.
  - Riesgo aceptado: hay seis de solo lectura que no lo comprueban
    (`horas_disponibles`, `dias_disponibles`, `distribucion_activa`, `distribucion_a_json`,
    `duracion_para`, `turno_de`). Dan información de disponibilidad o del plano, y solo
    existen usuarios autenticados del personal porque el alta pública está desactivada.
    La prueba fija esa lista.

## Límites de intentos (tabla `limite_intentos`)

| Acción | Límite |
|---|---|
| Retener mesa (reserva web) | 30 por IP cada 10 min |
| Confirmar reserva | 10 por IP cada 10 min |
| Solicitud de grupo / lista de espera | 5 por IP cada 10 min |
| Gestión por código (ver, cambiar, cancelar) | por IP |
| Acceso al panel | 5 fallos por correo o 20 por IP cada 15 min (solo cuentan los fallos) |
| Recuperar contraseña | 3 por correo y 10 por IP cada hora; misma respuesta exista o no el correo |

Además, Turnstile protege la reserva pública en producción.

## Cabeceras HTTP (`next.config.ts`)

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (sin cámara,
micrófono, ubicación ni pagos) y `Strict-Transport-Security`.

La CSP limita los orígenes a:

- el propio sitio;
- Supabase (HTTPS y WebSocket);
- Turnstile y Cloudflare Web Analytics.

Además prohíbe que otros sitios incrusten la web (`frame-ancestors 'none'`). Permite
scripts en línea: la web se prerenderiza para caber en el plan gratuito y un nonce
obligaría a renderizar cada petición. Riesgo aceptado, mitigado porque la web no pinta
HTML de terceros.

`tests/e2e/seguridad.spec.ts` comprueba las cabeceras y recorre la web y el panel
(Tiempo Real incluido) sin ninguna violación de la CSP.

## Secretos

- **Código del navegador:** `scripts/seguridad/sin-secretos.mjs` revisa `.next/static`
  y `.open-next/assets` tras cada build (en la CI y antes de cada despliegue). Busca:
  - los valores de los secretos del entorno;
  - JWT con rol `service_role`;
  - claves `sb_secret_` y de Resend.

  Probado con una clave plantada: la detecta.
- **Historial de git** (todas las ramas): sin secretos. La única coincidencia es la clave
  anónima pública de demostración de Supabase local (`iss: supabase-demo`), en la rama
  `vista-estatica`.
- **Dónde viven los secretos:** ver `SETUP.md` (GitHub Actions, Worker, `.env.local` y
  `.dev.vars` ignorados por git). `ADMIN_EMAIL` es una variable de GitHub, no está en el
  repositorio.

## Otros

- **Cuentas:** el alta pública está desactivada; el primer acceso obliga a cambiar la
  contraseña; la recuperación de contraseña usa enlaces de un solo uso.
- **Datos de salud (alergias):** consentimiento explícito aparte en la reserva.
- **Tareas programadas:** `/api/cron/tick` responde 401 sin `CRON_SECRET`; lo verifica la
  CI tras cada despliegue.
