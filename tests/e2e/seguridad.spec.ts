import { expect, test, type Page } from "@playwright/test";
import { entrarComo, soloEn } from "./utils";

/** Recoge las violaciones de la política de seguridad de contenidos (CSP) de la página. */
function vigilarCsp(page: Page) {
  const violaciones: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (load|connect|execute|frame)/i.test(m.text())) violaciones.push(m.text());
  });
  return violaciones;
}

test.describe("Seguridad", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "Una pasada basta");
  });

  test("cabeceras de seguridad en la web y el panel", async ({ request }) => {
    for (const ruta of ["/es", "/panel/acceso", "/api/disponibilidad?locale=es"]) {
      const r = await request.get(ruta);
      const h = r.headers();
      expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
      expect(h["x-content-type-options"], ruta).toBe("nosniff");
      expect(h["x-frame-options"], ruta).toBe("DENY");
      expect(h["referrer-policy"], ruta).toBe("strict-origin-when-cross-origin");
      expect(h["strict-transport-security"], ruta).toContain("max-age=");
    }
  });

  test("la web pública no incumple la CSP", async ({ page }) => {
    const violaciones = vigilarCsp(page);
    for (const ruta of ["/es", "/es/carta", "/va/arroceria", "/en/reservar"]) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      await page.mouse.wheel(0, 2000); // carga perezosa de animaciones
      await page.waitForTimeout(300);
    }
    expect(violaciones).toEqual([]);
  });

  test("el panel no incumple la CSP (incluido Tiempo Real)", async ({ page }) => {
    const violaciones = vigilarCsp(page);
    await entrarComo(page, "administrador");
    await expect(page.getByTestId("plano-servicio").locator("canvas").first()).toBeVisible();
    for (const ruta of ["/panel/reservas", "/panel/mapa", "/panel/carta", "/panel/informes"]) {
      await page.goto(ruta, { waitUntil: "networkidle" });
    }
    expect(violaciones).toEqual([]);
  });
});
