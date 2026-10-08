import { Client } from "pg";

// Conexión directa a PostgreSQL (Supabase local) para las pruebas del motor.
export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

/** Ejecuta `fn` dentro de una transacción que siempre se deshace. */
export async function enTransaccion<T>(
  client: Client,
  fn: (db: Client) => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    return await fn(client);
  } finally {
    await client.query("rollback");
  }
}

/** Primera fecha (YYYY-MM-DD) a partir de hoy + `desde` días con ese día de la semana (0 = domingo). */
export async function proximaFecha(db: Client, diaSemana: number, desde = 20): Promise<string> {
  const { rows } = await db.query<{ f: string }>(
    `select to_char(d, 'YYYY-MM-DD') f
       from generate_series(current_date + $2::int, current_date + $2::int + 6, interval '1 day') d
      where extract(dow from d) = $1 limit 1`,
    [diaSemana, desde],
  );
  return rows[0].f;
}

export async function instante(db: Client, fecha: string, hora: string): Promise<string> {
  const { rows } = await db.query<{ t: Date }>(
    "select public.hora_local($1::date, $2::time) t",
    [fecha, hora],
  );
  return rows[0].t.toISOString();
}

export type Hora = { inicio: Date; hora: string; turno: string; zonas: string[]; disponible: boolean };

export async function horas(db: Client, fecha: string, n: number, zona?: string): Promise<Hora[]> {
  const { rows } = await db.query<Hora>(
    "select * from public.horas_disponibles($1::date, $2::int, $3::uuid)",
    [fecha, n, zona ?? null],
  );
  return rows;
}

export async function rpc<T = Record<string, unknown>>(
  db: Client,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const { rows } = await db.query<{ r: T }>(`select ${sql} as r`, params);
  return rows[0].r;
}

export const ZONA = {
  sala: "00000000-0000-4000-a000-000000000001",
  terraza: "00000000-0000-4000-a000-000000000002",
};

export const MESA = (n: string) => {
  const ids: Record<string, string> = {};
  for (let i = 1; i <= 14; i++) ids[`S${i}`] = `00000000-0000-4000-c000-0000000001${String(i).padStart(2, "0")}`;
  for (let i = 1; i <= 8; i++) ids[`T${i}`] = `00000000-0000-4000-c000-0000000002${String(i).padStart(2, "0")}`;
  return ids[n];
};

/** Datos de cliente válidos para confirmar una reserva online. */
export function datosCliente(extra: Record<string, unknown> = {}) {
  return {
    nombre: "Prueba",
    telefono: "600123456",
    correo: "prueba@example.com",
    idioma: "es",
    acepta_privacidad: true,
    ...extra,
  };
}
