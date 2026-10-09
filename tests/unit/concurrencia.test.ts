/**
 * Dos ocupaciones simultáneas de la misma mesa no se interbloquean.
 *
 * Sin el bloqueo por día (`serializar_ocupacion`), dos inserciones que chocan en la
 * restricción de exclusión podían esperarse la una a la otra y PostgreSQL abortaba una
 * con «deadlock detected» (≈1 de cada 10 intentos en local). Ahora la segunda siempre
 * recibe una violación de exclusión limpia, que `retener_mesa` sabe tratar.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DESDE = "2031-01-01";
const INSERTAR = `insert into public.retencion (token, mesa_id, zona_id, inicio, comensales, intervalo, caduca_en)
  values (gen_random_uuid(), '00000000-0000-4000-c000-000000000101', '00000000-0000-4000-a000-000000000001',
          $1, 2, tstzrange($1, $1::timestamptz + interval '2 hours'), now() + interval '5 minutes')`;

let a: Client;
let b: Client;

beforeAll(async () => {
  [a, b] = [new Client({ connectionString: DATABASE_URL }), new Client({ connectionString: DATABASE_URL })];
  await Promise.all([a.connect(), b.connect()]);
});

afterAll(async () => {
  await a.query("delete from public.retencion where inicio >= $1", [DESDE]);
  await Promise.all([a.end(), b.end()]);
});

describe("Concurrencia en la ocupación de mesas", () => {
  it("dos retenciones simultáneas de la misma mesa: una entra y la otra choca, sin interbloqueos", async () => {
    const ocupar = (c: Client, inicio: string) =>
      c.query(INSERTAR, [inicio]).then(
        () => c.query("commit").then(() => "ok"),
        async (e: { code?: string }) => {
          await c.query("rollback");
          return e.code ?? "?";
        },
      );
    const codigos: string[] = [];
    for (let i = 0; i < 150; i++) {
      const inicio = new Date(Date.parse(DESDE) + i * 86_400_000).toISOString();
      await a.query("begin");
      await b.query("begin");
      codigos.push(...(await Promise.all([ocupar(a, inicio), ocupar(b, inicio)])).sort());
    }
    const cuenta = (c: string) => codigos.filter((x) => x === c).length;
    expect({ ok: cuenta("ok"), exclusion: cuenta("23P01"), interbloqueo: cuenta("40P01") }).toEqual({
      ok: 150,
      exclusion: 150,
      interbloqueo: 0,
    });
  });
});
