import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrarComo, soloEn } from "./utils";

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
    for (const ruta of ["/es", "/va/carta", "/en/paella-valenciana", "/es/privacidad"]) {
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
    await page.goto("/panel/acceso");
    await auditar(page, "acceso");
    await entrarComo(page, "encargado");
    for (const ruta of ["/panel", "/panel/reservas", "/panel/reservas/nueva", "/panel/configuracion", "/panel/carta", "/panel/informes"]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      await auditar(page, ruta);
    }
  });
});
