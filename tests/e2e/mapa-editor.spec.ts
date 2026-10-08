import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

const TERRAZA = "00000000-0000-4000-a000-000000000002";
const TERRAZA_DIARIO = "00000000-0000-4000-b000-000000000002";

test.describe("Mapa de mesas: edición (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El editor se prueba en tableta");
  });

  test("se crea y publica una distribución nueva", async ({ page }) => {
    await sql("delete from distribucion where nombre = 'E2E Verano'");
    try {
      await entrarComo(page, "encargado", "/panel/mapa");
      const terraza = page.getByRole("region", { name: "Terraza" });
      await terraza.getByRole("button", { name: "Nueva distribución" }).click();
      await page.getByPlaceholder(/Fin de semana/).fill("E2E Verano");
      await page.getByRole("button", { name: "Crear y editar" }).click();
      await expect(page.getByRole("heading", { name: "E2E Verano" })).toBeVisible();

      // Añade una mesa redonda, le pone 6 sillas y publica.
      await page.getByRole("button", { name: "◯ Redonda" }).click();
      await expect(page.getByRole("heading", { name: /^Mesa T9$/ })).toBeVisible();
      await page.getByRole("button", { name: "Añadir sillas" }).click();
      await page.getByRole("button", { name: "Añadir sillas" }).click();
      await expect(page.getByText("Borrador guardado")).toBeVisible();
      await page.getByRole("button", { name: "Publicar" }).click();
      await expect(page.getByText(/^Publicada\./)).toBeVisible();

      const [d] = await sql<{ estado: string; mesas: string; t9: number }>(
        `select d.estado, (select count(*) from mesa m where m.distribucion_id = d.id and m.activa) mesas,
                (select capacidad_max from mesa m where m.distribucion_id = d.id and m.nombre = 'T9') t9
           from distribucion d where d.nombre = 'E2E Verano' and d.zona_id = $1`,
        [TERRAZA],
      );
      expect(d).toEqual({ estado: "publicada", mesas: "9", t9: 6 });
    } finally {
      await sql("delete from distribucion where nombre = 'E2E Verano'");
    }
  });

  test("publicar con una reserva que no cabe queda bloqueado y lista el conflicto", async ({ page }) => {
    const [{ r }] = await sql<{ r: { reserva_id: string } }>(
      `select public.crear_reserva_personal(jsonb_build_object(
         'inicio', public.hora_local(current_date + 25, '14:00'), 'comensales', 4, 'nombre', 'Conflicto E2E',
         'origen', 'telefono', 'mesas', jsonb_build_array('00000000-0000-4000-c000-000000000205')), true) r`,
    );
    try {
      await entrarComo(page, "encargado", `/panel/mapa/${TERRAZA_DIARIO}`);
      await page.getByLabel("Selección múltiple").check();
      await page.getByText("Lista de piezas").click();
      const piezas = page.getByRole("list", { name: "Piezas" });
      for (const m of ["T5", "T6", "T7", "T8"]) await piezas.getByRole("button", { name: `Mesa ${m}` }).click();
      await page.getByRole("button", { name: "Borrar", exact: true }).click();
      await expect(page.getByText("Borrador guardado")).toBeVisible();
      await page.getByRole("button", { name: "Publicar" }).click();

      const dialogo = page.getByRole("dialog", { name: "Antes de publicar" });
      await expect(dialogo).toContainText("No se puede publicar");
      await expect(dialogo).toContainText("Conflicto E2E");
      await expect(dialogo).toContainText("no cabe");
      await expect(dialogo.getByRole("button", { name: "Aceptar y publicar" })).toHaveCount(0);

      // Nada ha cambiado en el servicio: T5 sigue activa con su reserva.
      const [m] = await sql<{ activa: boolean; asignadas: string }>(
        `select activa, (select count(*) from asignacion a where a.mesa_id = m.id and a.reserva_id = $1 and a.activa) asignadas
           from mesa m where m.id = '00000000-0000-4000-c000-000000000205'`,
        [r.reserva_id],
      );
      expect(m).toEqual({ activa: true, asignadas: "1" });
    } finally {
      await sql("delete from reserva where id = $1", [r.reserva_id]);
      await sql("update distribucion set borrador = null, borrador_pendiente = false where id = $1", [TERRAZA_DIARIO]);
    }
  });
});
