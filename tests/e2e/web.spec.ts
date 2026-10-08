import { expect, test } from "@playwright/test";
import { soloEn } from "./utils";

test.describe("Web pública", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "La web pública se prueba en móvil");
  });

  test("la portada tiene alternativa sin movimiento y el botón de reservar funciona", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es");
    await expect(page.locator(".portada-animada")).toBeHidden();
    const estatica = page.locator(".portada-estatica");
    await expect(estatica).toBeVisible();
    await expect(estatica.getByRole("img", { name: "Yerga · Arroces con alma" })).toBeVisible();
    await expect(estatica.locator("ol").getByRole("img")).toHaveCount(5);
    await estatica.getByRole("link", { name: "Reservar mesa" }).click();
    await expect(page).toHaveURL(/\/es\/reservar$/);
  });

  test("con movimiento, la portada se cocina con el scroll", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator(".portada-animada")).toBeVisible();
    await expect(page.locator(".portada-animada").getByText("01 · Fuego")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>(".portada-animada")!.offsetHeight * 0.95));
    await expect(page.locator(".portada-animada").getByText("05 · Socarrat")).toBeVisible({ timeout: 10_000 });
  });

  test("botón fijo de reservar en móvil y datos estructurados del restaurante", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator(".fixed.bottom-0").getByRole("link", { name: "Reservar mesa" })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const datos = JSON.parse(ld!);
    expect(datos["@type"]).toBe("Restaurant");
    expect(datos.potentialAction["@type"]).toBe("ReserveAction");
  });

  test("la carta muestra precios y alérgenos, y cambia de idioma", async ({ page }) => {
    await page.goto("/es/carta");
    await expect(page.getByRole("heading", { name: "Paella valenciana" })).toBeVisible();
    await expect(page.getByText(/16,50\s€ \/ persona/).first()).toBeVisible();
    await expect(page.getByText(/Alérgenos: Pescado/).first()).toBeVisible();
    await page.getByRole("link", { name: "va", exact: true }).click();
    await expect(page).toHaveURL(/\/va\/carta$/);
    await expect(page.getByRole("heading", { name: "Melós de llamàntol" })).toBeVisible();
  });

  test("páginas para buscadores, legales y sitemap", async ({ page, request }) => {
    for (const ruta of ["/es/paella-valenciana", "/en/arroceria", "/va/comidas-de-grupo", "/es/privacidad"]) {
      const r = await page.goto(ruta);
      expect(r?.status(), ruta).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    const sitemap = await request.get("/sitemap.xml");
    expect(await sitemap.text()).toContain("/va/carta");
  });
});
