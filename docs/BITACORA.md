# Bitácora del trabajo autónomo

Memoria entre sesiones. Al arrancar o reanudar: leer el **Resumen** y el **Siguiente paso**,
y seguir desde ahí. Nunca se escriben aquí valores secretos.

## Resumen (actualizado al final de cada bloque y de cada sesión)

**Estado:** sesión 1 en curso (jueves 8 de octubre de 2026, noche).

**Hecho**
- PR #3 (documentación de coste cero) fusionado en `main`.

**Pendiente**
- Bloques A–E según el encargo.

**Bloqueado: necesito de ti** (detalle en «Bloqueos»)
- Ejecutar la parte de secretos en tu ordenador (sección 0.1 de `docs/INFRA-COSTE-CERO.md`).

**Siguiente paso exacto:** ver la última entrada del diario.

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
(lo preparo en el bloque A) con `~/yerga-secrets.txt` presente, o abrir una sesión de
Claude Code en tu terminal y pedirle que siga esta bitácora. Alternativa en la nube:
añadir esos dominios a «Allowed domains» del entorno y darme las credenciales como
variables del entorno.

## Decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 08/10 | Fusiono el PR #3 aunque «verificar» estaba en rojo | Pedido explícito; solo documentación. El fallo era una prueba dependiente de la hora, presente ya en `main` |

## Diario

### 08/10 · Arranque
- Fusionado el PR #3 (squash). Leídos los documentos en el orden pedido.
- CI roja en `main`: `mapa-servicio.spec.ts` › «el deslizador…» falla cuando la CI corre
  después del turno (el deslizador ya está en el máximo y «ArrowRight» no lo mueve).
  Reproducido en local a las 22:17 y arreglado: la prueba pulsa «Inicio» antes de avanzar.
- **Siguiente paso:** fusionar `fix/prueba-deslizador-hora` con la CI en verde; después,
  bloque A desde A3.
