import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

// Periodo cerrado en el pasado para no chocar con otras pruebas: febrero de 2025
// (28 días); el anterior es del 4 al 31 de enero.
test.describe("Informes (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El panel se prueba en tableta");
  });

  test("comparación con el periodo anterior y exportación a CSV sin datos de contacto", async ({ page }) => {
    const reserva = async (fecha: string, comensales: number) =>
      (
        await sql<{ id: string }>(
          `insert into reserva (nombre, telefono, correo, inicio, fin, comensales, duracion_min, turno_nombre, estado, origen)
           values ('Informe E2E', '+34600111222', 'informe@example.com', hora_local($1::date, '14:00'),
                   hora_local($1::date, '14:00') + interval '2 hours', $2, 120, 'comida', 'finalizada', 'web') returning id`,
          [fecha, comensales],
        )
      )[0].id;
    const ids = [await reserva("2025-02-10", 4), await reserva("2025-02-11", 6), await reserva("2025-01-20", 2)];
    try {
      await entrarComo(page, "encargado", "/panel/informes?desde=2025-02-01&hasta=2025-02-28");
      await expect(page.getByText("Comparado con el periodo anterior: del 2025-01-04 al 2025-01-31.")).toBeVisible();
      const tarjeta = (t: string) => page.getByRole("region", { name: "Resumen" }).locator("div").filter({ has: page.getByText(t, { exact: true }) });
      await expect(tarjeta("Comensales atendidos")).toContainText("10");
      await expect(tarjeta("Comensales atendidos")).toContainText("▲ 8 frente al anterior");

      const descarga = page.waitForEvent("download");
      await page.getByRole("button", { name: "Descargar reservas (CSV)" }).click();
      const d = await descarga;
      expect(d.suggestedFilename()).toBe("reservas_2025-02-01_2025-02-28.csv");
      const csv = await readFile((await d.path())!, "utf8");
      expect(csv.split("\r\n")[0]).toBe("﻿Fecha;Hora;Turno;Comensales;Estado;Origen;Mesas;Arroces;Creada");
      expect(csv).toContain("2025-02-10;14:00;comida;4;finalizada;web");
      expect(csv).not.toContain("2025-01-20");
      expect(csv).not.toContain("Informe E2E");
      expect(csv).not.toContain("600111222");
    } finally {
      await sql("delete from reserva where id = any($1::uuid[])", [ids]);
    }
  });
});
