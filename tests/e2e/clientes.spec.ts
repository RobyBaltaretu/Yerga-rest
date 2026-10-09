import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

test.describe("Fichas de cliente (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El panel se prueba en tableta");
  });

  test("resumen, alergias editables y RGPD (exportar y anonimizar) para el administrador", async ({ page }) => {
    const tel = `+3469${Date.now().toString().slice(-7)}`;
    const [{ id }] = await sql<{ id: string }>(
      "insert into cliente (nombre, telefono, correo) values ('Ficha E2E', $1, 'ficha@example.com') returning id",
      [tel],
    );
    await sql(
      `insert into reserva (cliente_id, nombre, telefono, inicio, fin, comensales, duracion_min, estado)
       values ($1, 'Ficha E2E', $2, now() - interval '10 days', now() - interval '10 days' + interval '2 hours', 4, 120, 'finalizada'),
              ($1, 'Ficha E2E', $2, now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 2, 120, 'no_presentada')`,
      [id, tel],
    );
    try {
      await entrarComo(page, "administrador", `/panel/clientes/${id}`);
      await expect(page.getByRole("heading", { name: "Ficha E2E" })).toBeVisible();
      const resumen = (k: string) => page.locator("dl > div").filter({ hasText: k }).locator("dd");
      await expect(resumen("Visitas")).toHaveText("1");
      await expect(resumen("Plantones")).toHaveText("1");

      await page.getByLabel("Alergias e intolerancias").fill("Marisco");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByText("Alergias: Marisco")).toBeVisible();

      const descarga = page.waitForEvent("download");
      await page.getByRole("button", { name: "Exportar sus datos" }).click();
      const archivo = await (await descarga).path();
      const datos = JSON.parse(await (await import("node:fs/promises")).readFile(archivo!, "utf8"));
      expect(datos.cliente.alergias).toBe("Marisco");
      expect(datos.reservas).toHaveLength(2);

      await page.getByRole("button", { name: "Anonimizar…" }).click();
      await page.getByRole("button", { name: "Sí, anonimizar" }).click();
      await expect(page.getByRole("heading", { name: "Cliente anonimizado" })).toBeVisible();
      const [r] = await sql<{ n: string }>("select count(*)::text n from reserva where telefono = $1", [tel]);
      expect(r.n).toBe("0");
    } finally {
      await sql("delete from reserva where cliente_id = $1", [id]);
      await sql("delete from cliente where id = $1", [id]);
    }
  });

  test("la sala ve la ficha pero no las herramientas de protección de datos", async ({ page }) => {
    const [{ id }] = await sql<{ id: string }>("select cliente_id id from reserva where cliente_id is not null limit 1");
    await entrarComo(page, "sala", `/panel/clientes/${id}`);
    await expect(page.getByLabel("Notas internas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar sus datos" })).toHaveCount(0);
  });
});
