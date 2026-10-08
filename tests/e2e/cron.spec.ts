import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { soloEn, sql } from "./utils";

const secreto = (() => {
  try {
    return readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1]?.trim() ?? "";
  } catch {
    return process.env.CRON_SECRET ?? "";
  }
})();

test.describe("Tareas programadas", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "Una vez basta");
  });

  test("sin secreto no se ejecuta", async ({ request }) => {
    const r = await request.post("/api/cron/tick");
    expect(r.status()).toBe(401);
  });

  test("envía el recordatorio 24 h antes una sola vez y caduca retenciones", async ({ request }) => {
    const correo = `e2e-recordatorio-${Date.now()}@example.com`;
    const [{ id }] = await sql<{ id: string }>(
      `insert into reserva (nombre, correo, telefono, inicio, fin, comensales, duracion_min, creada_en, idioma)
       values ('Recordatorio E2E', $1, '+34600999888', now() + interval '20 hours', now() + interval '22 hours', 2, 105, now() - interval '3 days', 'va')
       returning id`,
      [correo],
    );
    await sql(`insert into retencion (token, mesa_id, zona_id, inicio, comensales, intervalo, caduca_en)
               select gen_random_uuid(), m.id, d.zona_id, now() + interval '40 days', 2,
                      tstzrange(now() + interval '40 days', now() + interval '41 days'), now() - interval '1 minute'
                 from mesa m join distribucion d on d.id = m.distribucion_id where m.nombre = 'S14' limit 1`);
    try {
      const r1 = await request.post("/api/cron/tick", { headers: { authorization: `Bearer ${secreto}` } });
      expect(r1.ok()).toBe(true);
      const cuerpo = await r1.json();
      expect(cuerpo.tick.retenciones_caducadas).toBeGreaterThanOrEqual(1);
      await request.post("/api/cron/tick", { headers: { authorization: `Bearer ${secreto}` } });
      const mensajes = await sql<{ tipo: string; asunto: string; idioma: string }>("select tipo, asunto, idioma from mensaje where reserva_id = $1", [id]);
      expect(mensajes).toHaveLength(1);
      expect(mensajes[0]).toMatchObject({ tipo: "recordatorio", idioma: "va" });
      expect(mensajes[0].asunto).toContain("Demà");
    } finally {
      await sql("delete from reserva where id = $1", [id]);
    }
  });
});
