import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

/** Sin errores graves ni críticos de WCAG 2.1 A/AA. */
async function auditar(page: Page, nombre: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    graves.map((v) => `${nombre}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

test.describe("Accesibilidad", () => {
  test("web pública (móvil)", async ({ page }, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "móvil");
    for (const ruta of ["/es", "/va", "/en", "/es/carta", "/va/carta", "/es/arroceria", "/es/comidas-de-grupo", "/en/paella-valenciana", "/es/privacidad", "/en/aviso-legal"]) {
      await page.goto(ruta);
      await auditar(page, ruta);
    }
    await page.goto("/es/reservar");
    await page.getByRole("button", { name: "2 personas", exact: true }).click();
    await page.locator('button[data-estado="disponible"]').first().waitFor();
    await auditar(page, "reservar: calendario");
  });

  test("panel (tableta)", async ({ page }, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "tableta");
    for (const ruta of ["/panel/acceso", "/panel/acceso/recuperar"]) {
      await page.goto(ruta);
      await auditar(page, ruta);
    }
    const [{ reserva, cliente }] = await sql<{ reserva: string; cliente: string }>("select id reserva, cliente_id cliente from reserva where cliente_id is not null limit 1");
    await entrarComo(page, "administrador");
    for (const ruta of [
      "/panel",
      "/panel/reservas",
      "/panel/reservas?vista=linea",
      "/panel/reservas/nueva",
      `/panel/reservas/${reserva}`,
      "/panel/espera",
      "/panel/clientes",
      `/panel/clientes/${cliente}`,
      "/panel/arroces",
      "/panel/mapa",
      "/panel/mapa/00000000-0000-4000-b000-000000000001",
      "/panel/carta",
      "/panel/configuracion",
      "/panel/informes",
      "/panel/registro",
      "/panel/usuarios",
    ]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Cargando…")).toHaveCount(0);
      await auditar(page, ruta);
    }
  });
});
