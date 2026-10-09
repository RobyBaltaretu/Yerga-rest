import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

const FECHA = "2027-03-06"; // sábado: comida y cena

test.describe("Arroces para cocina (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El panel se prueba en tableta");
  });

  test("totales, franjas de media hora y filtro por turno", async ({ page }) => {
    const plato = async (nombre: string) =>
      (await sql<{ id: string }>("select id from plato where nombre->>'es' = $1", [nombre]))[0].id;
    const reserva = async (nombre: string, hora: string, turno: string) =>
      (
        await sql<{ id: string }>(
          `insert into reserva (nombre, inicio, fin, comensales, duracion_min, turno_nombre)
           values ($1, hora_local($2::date, $3::time), hora_local($2::date, $3::time) + interval '2 hours', 4, 120, $4) returning id`,
          [nombre, FECHA, hora, turno],
        )
      )[0].id;
    const ids = [
      await reserva("Arroces E2E uno", "13:40", "comida"),
      await reserva("Arroces E2E dos", "13:50", "comida"),
      await reserva("Arroces E2E cena", "21:00", "cena"),
    ];
    await sql(
      `insert into encargo_arroz (reserva_id, plato_id, raciones) values ($1, $4, 4), ($2, $4, 2), ($2, $5, 2), ($3, $5, 3)`,
      [...ids, await plato("Paella valenciana"), await plato("Arròs a banda")],
    );
    try {
      await entrarComo(page, "sala", `/panel/arroces?fecha=${FECHA}`);
      const franja = page.getByRole("region", { name: "Desde las 13:30" });
      await expect(franja.getByText("Paella valenciana × 6")).toBeVisible();
      await expect(franja.getByText("Arròs a banda × 2")).toBeVisible();
      await expect(page.getByRole("heading", { name: /Totales · 11 raciones/ })).toBeVisible();

      await page.getByRole("link", { name: "cena" }).click();
      await expect(page.getByRole("heading", { name: /Totales · 3 raciones/ })).toBeVisible();
      await expect(page.getByRole("region", { name: "Desde las 21:00" })).toContainText("Arroces E2E cena");
      await expect(page.getByText("Arroces E2E uno")).toHaveCount(0);
    } finally {
      await sql("delete from reserva where id = any($1::uuid[])", [ids]);
    }
  });
});
