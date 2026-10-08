import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

test.describe("Panel: reservas y tiempo real (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El panel se prueba en tableta");
  });

  test("un cambio en una tableta aparece en otra sin recargar", async ({ browser }) => {
    const [{ fecha }] = await sql<{ fecha: string }>(
      `select to_char(d, 'YYYY-MM-DD') fecha from generate_series(current_date + 14, current_date + 20, interval '1 day') d
        where extract(dow from d) = 6 limit 1`,
    );
    const [{ r }] = await sql<{ r: { reserva_id: string } }>(
      `select public.crear_reserva_personal(jsonb_build_object('inicio', public.hora_local($1::date, '13:30'),
         'comensales', 2, 'nombre', 'Tiempo Real E2E', 'origen', 'telefono'), true) r`,
      [fecha],
    );
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    try {
      const a = await ctxA.newPage();
      const b = await ctxB.newPage();
      const url = `/panel?fecha=${fecha}&turno=comida`;
      await entrarComo(a, "sala", url);
      await entrarComo(b, "encargado", url);
      const tarjetaA = a.locator(`li[data-reserva="${r.reserva_id}"]`);
      const tarjetaB = b.locator(`li[data-reserva="${r.reserva_id}"]`);
      await expect(tarjetaB).toContainText("Confirmada");
      // Esperamos a que la suscripción de la tableta B esté activa.
      await b.waitForTimeout(1500);

      await tarjetaA.getByRole("button", { name: "Sentar" }).click();
      await expect(tarjetaA).toContainText("Sentada");
      await expect(tarjetaB).toContainText("Sentada", { timeout: 5_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
      await sql("delete from reserva where id = $1", [r.reserva_id]);
    }
  });

  test("sentar a un cliente sin reserva retira la mesa de la web en menos de 5 segundos", async ({ page }) => {
    // Hoy abrimos un turno todo el día sin antelación mínima y dejamos libre solo S1.
    const [turnosHoy] = await sql<{ t: unknown }>(
      `select coalesce(json_agg(t), '[]') t from turno t where dia_semana = extract(dow from current_date)`,
    );
    const [conf] = await sql<{ antelacion_min_min: number }>("select antelacion_min_min from configuracion");
    await sql(`delete from turno where dia_semana = extract(dow from current_date)`);
    await sql(`insert into turno (nombre, dia_semana, inicio, fin, ultima_hora, tope_franja)
               values ('comida', extract(dow from current_date), '00:00', '23:59', '23:45', 999)`);
    await sql("update configuracion set antelacion_min_min = 0");
    await sql(`insert into bloqueo (rango, mesa_id, motivo)
               select tstzrange(now() - interval '1 hour', now() + interval '1 day'), id, 'e2e-puerta'
                 from mesa where nombre <> 'S1'`);
    // Lo que ya hubiera en S1 hoy se aparta para empezar con la mesa libre.
    const apartadas = (
      await sql<{ id: string }>(`update asignacion set activa = false
                where mesa_id = (select id from mesa where nombre = 'S1')
                  and intervalo && tstzrange(now() - interval '3 hours', now() + interval '1 day') and activa
              returning id`)
    ).map((f) => f.id);

    const hayHuecoAhora = async () => {
      const [{ libre }] = await sql<{ libre: boolean }>(
        `select coalesce(bool_or(disponible), false) libre from horas_disponibles(current_date, 2)
          where inicio between now() and now() + interval '20 minutes'`,
      );
      return libre;
    };

    try {
      expect(await hayHuecoAhora()).toBe(true);
      await entrarComo(page, "sala", "/panel");
      await page.getByText("Ver mesas como lista").click();
      await page.getByRole("button", { name: /^Mesa S1 · Libre/ }).click();
      const dialogo = page.getByRole("dialog", { name: /Mesa S1/ });
      await dialogo.getByRole("button", { name: "2", exact: true }).click();
      const empieza = Date.now();
      await expect(page.getByText(/cliente sin reserva sentado/)).toBeVisible();
      await expect.poll(hayHuecoAhora, { timeout: 5_000, intervals: [200] }).toBe(false);
      expect(Date.now() - empieza).toBeLessThan(5_000);
    } finally {
      await sql("delete from reserva where origen = 'puerta' and creada_en > now() - interval '5 minutes'");
      await sql("delete from bloqueo where motivo = 'e2e-puerta'");
      if (apartadas.length) await sql("update asignacion set activa = true where id = any($1::uuid[])", [apartadas]);
      await sql(`delete from turno where dia_semana = extract(dow from current_date)`);
      await sql(
        `insert into turno select * from json_populate_recordset(null::turno, $1::json)`,
        [JSON.stringify(turnosHoy.t)],
      );
      await sql("update configuracion set antelacion_min_min = $1", [conf.antelacion_min_min]);
    }
  });

  test("alta rápida por teléfono en tres toques con mesa propuesta", async ({ page }) => {
    await entrarComo(page, "sala", "/panel/reservas/nueva");
    await page.locator("#n-fecha").fill(
      (await sql<{ f: string }>("select to_char(d, 'YYYY-MM-DD') f from generate_series(current_date + 15, current_date + 21, interval '1 day') d where extract(dow from d) = 0 limit 1"))[0].f,
    );
    await page.getByRole("button", { name: "4", exact: true }).click();
    await page.getByRole("list", { name: "Horas" }).getByRole("button", { name: "14:00" }).click();
    await page.locator("#n-nombre").fill("Alta Rápida E2E");
    await page.getByRole("button", { name: "Crear reserva" }).click();
    await expect(page.getByText("Reserva creada.")).toBeVisible();
    const [r] = await sql<{ mesas: string[] }>(
      `select array_agg(m.nombre) mesas from reserva r join asignacion a on a.reserva_id = r.id join mesa m on m.id = a.mesa_id
        where r.nombre = 'Alta Rápida E2E' group by r.id`,
    );
    expect(r.mesas).toHaveLength(1);
    await sql("delete from reserva where nombre = 'Alta Rápida E2E'");
  });
});
