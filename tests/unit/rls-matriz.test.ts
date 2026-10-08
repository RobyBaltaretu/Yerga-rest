/**
 * Matriz de permisos (RLS y privilegios) de TODAS las tablas con cada rol.
 *
 * Para cada tabla y rol se ejecutan de verdad `select`, `update` y `delete` como lo haría
 * alguien con la API de Supabase, dentro de una transacción que se deshace. El resultado
 * se compara con la matriz esperada de abajo, que documenta quién puede qué:
 *
 *   "x"  la base lo rechaza (sin privilegio)
 *   0    no ve o no afecta a ninguna fila (lo filtra RLS)
 *   "+"  ve o afecta al menos a una fila (una clave ajena que impide el borrado cuenta
 *        como permitido: RLS dejó pasar la orden)
 *
 * Roles en orden: anónimo, sala, encargado, administrador.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

type R = "x" | 0 | "+";
type Fila = { select: [R, R, R, R]; update: [R, R, R, R]; delete: [R, R, R, R] };

const PUBLICA: Fila = { select: ["+", "+", "+", "+"], update: ["x", 0, "+", "+"], delete: ["x", 0, "+", "+"] };
const SALA_LEE_GESTION_EDITA: Fila = { select: ["x", "+", "+", "+"], update: ["x", 0, "+", "+"], delete: ["x", 0, "+", "+"] };
const OPERACION: Fila = { select: ["x", "+", "+", "+"], update: ["x", "+", "+", "+"], delete: ["x", "+", "+", "+"] };
const SOLO_LECTURA_PERSONAL: Fila = { select: ["x", "+", "+", "+"], update: ["x", 0, 0, 0], delete: ["x", 0, 0, 0] };

const matriz: Record<string, Fila> = {
  // Configuración: se lee públicamente (solo columnas no internas); no se borra nunca.
  configuracion: { select: ["+", "+", "+", "+"], update: ["x", 0, "+", "+"], delete: ["x", 0, 0, 0] },
  zona: PUBLICA,
  turno: PUBLICA,
  contenido: PUBLICA,
  plato: PUBLICA,
  resena: PUBLICA,
  plantilla_mensaje: SALA_LEE_GESTION_EDITA,
  distribucion: SALA_LEE_GESTION_EDITA,
  programacion_distribucion: SALA_LEE_GESTION_EDITA,
  mesa: SALA_LEE_GESTION_EDITA,
  combinacion: SALA_LEE_GESTION_EDITA,
  combinacion_mesa: SALA_LEE_GESTION_EDITA,
  elemento_fijo: SALA_LEE_GESTION_EDITA,
  // La sala bloquea y desbloquea mesas concretas, pero no edita bloqueos.
  bloqueo: { select: ["x", "+", "+", "+"], update: ["x", 0, "+", "+"], delete: ["x", "+", "+", "+"] },
  // Clientes: solo el administrador los borra (derecho de supresión).
  cliente: { select: ["x", "+", "+", "+"], update: ["x", "+", "+", "+"], delete: ["x", 0, 0, "+"] },
  // Las reservas no se borran: se cancelan (queda el historial).
  reserva: { select: ["x", "+", "+", "+"], update: ["x", "+", "+", "+"], delete: ["x", 0, 0, 0] },
  asignacion: OPERACION,
  encargo_arroz: OPERACION,
  lista_espera: OPERACION,
  // Las escriben las funciones del motor y los correos, no el personal.
  retencion: SOLO_LECTURA_PERSONAL,
  mensaje: SOLO_LECTURA_PERSONAL,
  // Usuarios: el personal ve a sus compañeros; solo el administrador los gestiona.
  usuario: { select: ["x", "+", "+", "+"], update: ["x", 0, 0, "+"], delete: ["x", 0, 0, "+"] },
  // Registro de cambios: inalterable; solo lo leen encargado y administrador.
  registro_cambios: { select: ["x", 0, "+", "+"], update: ["x", 0, 0, 0], delete: ["x", 0, 0, 0] },
  // Límite de intentos: solo funciones y rol de servicio.
  limite_intentos: { select: ["x", 0, 0, 0], update: ["x", 0, 0, 0], delete: ["x", 0, 0, 0] },
};

const ROLES = [
  { nombre: "anónimo", rol: "anon", sub: null },
  { nombre: "sala", rol: "authenticated", sub: "00000000-0000-4000-e000-000000000003" },
  { nombre: "encargado", rol: "authenticated", sub: "00000000-0000-4000-e000-000000000002" },
  { nombre: "administrador", rol: "authenticated", sub: "00000000-0000-4000-e000-000000000001" },
] as const;

// Filas mínimas para las tablas que la semilla deja vacías (se deshacen al terminar).
const FIJAS = `
  insert into public.bloqueo (rango, mesa_id, motivo)
    values (tstzrange(now() + interval '400 days', now() + interval '400 days 1 hour'), '00000000-0000-4000-c000-000000000101', 'matriz-rls');
  insert into public.limite_intentos (clave) values ('matriz-rls');
  insert into public.lista_espera (nombre, telefono, fecha, turno_nombre, comensales)
    values ('Matriz RLS', '+34600000000', current_date + 400, 'comida', 2);
  insert into public.mensaje (tipo, destinatario, asunto) values ('prueba', 'matriz@example.com', 'Matriz RLS');
  insert into public.programacion_distribucion (distribucion_id, dia_semana)
    values ('00000000-0000-4000-b000-000000000001', 1);
  insert into public.retencion (token, mesa_id, zona_id, inicio, comensales, intervalo, caduca_en)
    values (gen_random_uuid(), '00000000-0000-4000-c000-000000000101', '00000000-0000-4000-a000-000000000001',
            now() + interval '400 days', 2, tstzrange(now() + interval '400 days', now() + interval '400 days 2 hours'), now() + interval '5 minutes');
`;

let db: Client;
const columnas = new Map<string, string>();

beforeAll(async () => {
  db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  // Una columna de cada tabla para un `update` que no cambia nada.
  const { rows } = await db.query<{ t: string; c: string }>(
    `select distinct on (table_name) table_name t, column_name c
       from information_schema.columns where table_schema = 'public' and is_identity = 'NO' and is_generated = 'NEVER'
      order by table_name, ordinal_position`,
  );
  for (const r of rows) columnas.set(r.t, r.c);
});

afterAll(async () => {
  await db.end();
});

async function probar(tabla: string, op: "select" | "update" | "delete", rol: (typeof ROLES)[number]): Promise<R> {
  const c = columnas.get(tabla)!;
  const sql =
    op === "select"
      ? `select count(*)::int n from public.${tabla}`
      : op === "update"
        ? `with x as (update public.${tabla} set ${c} = ${c} returning 1) select count(*)::int n from x`
        : `with x as (delete from public.${tabla} returning 1) select count(*)::int n from x`;
  await db.query("begin");
  try {
    await db.query(FIJAS);
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(rol.sub ? { sub: rol.sub, role: rol.rol } : { role: rol.rol })]);
    await db.query(`set local role ${rol.rol}`);
    try {
      const { rows } = await db.query<{ n: number }>(sql);
      return rows[0].n > 0 ? "+" : 0;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "42501") return "x"; // sin privilegio
      if (code === "23503") return "+"; // RLS lo permitió; lo frena una clave ajena
      throw e;
    }
  } finally {
    await db.query("rollback");
  }
}

describe("Matriz RLS: cada tabla con cada rol", () => {
  it("cubre todas las tablas del esquema public", async () => {
    const { rows } = await db.query<{ t: string }>(`select tablename t from pg_tables where schemaname = 'public' order by 1`);
    expect(rows.map((r) => r.t).sort()).toEqual(Object.keys(matriz).sort());
  });

  it("todas las tablas tienen RLS activado", async () => {
    const { rows } = await db.query<{ t: string }>(`select relname t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(rows).toEqual([]);
  });

  it("el rol anónimo solo ejecuta las funciones auxiliares de rol", async () => {
    const { rows } = await db.query<{ f: string }>(
      `select p.proname f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    );
    // La reserva pública pasa siempre por el servidor (rol de servicio y Turnstile).
    expect(rows.map((r) => r.f)).toEqual(["es_admin", "es_personal", "es_servicio", "puede_gestionar", "rol_actual"]);
  });

  it("las funciones del personal comprueban el rol dentro (salvo las de solo lectura conocidas)", async () => {
    const { rows } = await db.query<{ f: string; d: string }>(
      `select p.proname f, pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
          and has_function_privilege('authenticated', p.oid, 'execute')`,
    );
    const sinComprobar = rows
      .filter((r) => !/exigir_personal|exigir_gestion|es_personal\(\)|puede_gestionar\(\)|es_servicio|auth\.uid\(\)/i.test(r.d))
      .map((r) => r.f)
      .sort();
    // Lecturas de disponibilidad y del plano: la misma información que ve la web pública
    // o la sala. Solo hay usuarios autenticados del personal (alta pública desactivada).
    expect(sinComprobar).toEqual(["dias_disponibles", "distribucion_a_json", "distribucion_activa", "duracion_para", "horas_disponibles", "turno_de"]);
  });

  for (const [tabla, esperado] of Object.entries(matriz)) {
    it(tabla, async () => {
      const real: Record<string, R[]> = {};
      for (const op of ["select", "update", "delete"] as const) {
        real[op] = [];
        for (const rol of ROLES) real[op].push(await probar(tabla, op, rol));
      }
      expect(real).toEqual(esperado);
    });
  }
});
