import { expect, test, type Page } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

const MESA = (n: number) => `00000000-0000-4000-c000-0000000001${String(n).padStart(2, "0")}`;

/** Centro en pantalla de una mesa del plano (a partir de sus coordenadas en cm). */
async function centroMesa(page: Page, nombre: string) {
  const [m] = await sql<{ x: number; y: number }>("select x::float x, y::float y from mesa where nombre = $1 and distribucion_id = '00000000-0000-4000-b000-000000000001'", [nombre]);
  const plano = page.getByTestId("plano-servicio");
  const caja = (await plano.boundingBox())!;
  const escala = Number(await plano.getAttribute("data-escala"));
  const ox = Number(await plano.getAttribute("data-origen-x"));
  const oy = Number(await plano.getAttribute("data-origen-y"));
  return { x: caja.x + (m.x - ox) * escala, y: caja.y + (m.y - oy) * escala };
}

async function arrastrar(page: Page, reservaId: string, mesa: string) {
  const asa = page.locator(`li[data-reserva="${reservaId}"]`).getByRole("button", { name: /^Arrastrar/ });
  const origen = (await asa.boundingBox())!;
  const destino = await centroMesa(page, mesa);
  await page.mouse.move(origen.x + origen.width / 2, origen.y + origen.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400); // da tiempo a cargar qué mesas son válidas
  await page.mouse.move(destino.x, destino.y, { steps: 12 });
  await page.mouse.up();
}

test.describe("Mapa de mesas: servicio (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El mapa de servicio se prueba en tableta");
  });

  test("arrastrar una reserva a otra mesa; una mesa no válida la rechaza y explica por qué", async ({ page }) => {
    const [{ fecha }] = await sql<{ fecha: string }>(
      `select to_char(d, 'YYYY-MM-DD') fecha from generate_series(current_date + 28, current_date + 34, interval '1 day') d
        where extract(dow from d) = 6 limit 1`,
    );
    const crear = async (nombre: string, mesa: number) =>
      (
        await sql<{ r: { reserva_id: string } }>(
          `select public.crear_reserva_personal(jsonb_build_object('inicio', public.hora_local($1::date, '13:30'),
             'comensales', 2, 'nombre', $2::text, 'origen', 'telefono', 'mesas', jsonb_build_array($3::uuid)), true) r`,
          [fecha, nombre, MESA(mesa)],
        )
      )[0].r.reserva_id;
    const a = await crear("Arrastre E2E", 1);
    const b = await crear("Ocupa S2 E2E", 2);
    try {
      await entrarComo(page, "encargado", `/panel?fecha=${fecha}&turno=comida`);
      await expect(page.getByTestId("plano-servicio").locator("canvas").first()).toBeVisible();

      // A una mesa libre: se mueve.
      await arrastrar(page, a, "S3");
      await expect(page.getByText(/Mover a Arrastre E2E de S1 a S3: hecho/)).toBeVisible();
      await expect.poll(async () => (await sql<{ n: string }>("select m.nombre n from asignacion x join mesa m on m.id = x.mesa_id where x.reserva_id = $1 and x.activa", [a]))[0]?.n).toBe("S3");

      // A una mesa ocupada a esa hora: se rechaza y se explica.
      await arrastrar(page, a, "S2");
      await expect(page.getByText(/S2: (ocupada a esa hora|choca con otra reserva).*Ocupa S2 E2E/)).toBeVisible();
      const [sigue] = await sql<{ n: string }>("select m.nombre n from asignacion x join mesa m on m.id = x.mesa_id where x.reserva_id = $1 and x.activa", [a]);
      expect(sigue.n).toBe("S3");
    } finally {
      await sql("delete from reserva where id = any($1::uuid[])", [[a, b]]);
    }
  });

  test("el deslizador muestra la sala a otra hora del turno", async ({ page }) => {
    await entrarComo(page, "sala", "/panel");
    const deslizador = page.getByLabel(/Ahora|Sala a las/);
    await deslizador.focus();
    // «Inicio» y luego dos pasos: mueve el deslizador a cualquier hora del día. Con solo
    // «ArrowRight», pasado el turno el valor ya está en el máximo y no cambia.
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Sala a las \d{2}:\d{2}/)).toBeVisible();
    await page.getByRole("button", { name: "Volver a ahora" }).click();
    await expect(page.getByText(/Sala a las/)).toHaveCount(0);
  });
});
