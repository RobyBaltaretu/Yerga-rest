import { expect, test } from "@playwright/test";
import { soloEn } from "./utils";

test.describe("Web pública", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "La web pública se prueba en móvil");
  });

  test("desde la portada se elige el número de personas y se entra al flujo con él", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("img", { name: "Yerga · Arroces con alma" }).first()).toBeAttached();
    await page.getByRole("button", { name: "Una persona más" }).click();
    const verHoras = page.getByRole("link", { name: "Ver horas libres" });
    await expect(verHoras).toHaveAttribute("href", /\/es\/reservar\?comensales=3$/);
    await verHoras.click();
    await expect(page).toHaveURL(/\/es\/reservar\?comensales=3$/);
    await expect(page.getByRole("button", { name: "3 personas", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("la web sigue el modo oscuro del sistema y el panel no cambia", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/es");
    const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await fondo()).toBe("rgb(13, 13, 13)");
    await page.emulateMedia({ colorScheme: "light" });
    expect(await fondo()).toBe("rgb(252, 252, 252)");
    await page.goto("/panel/acceso");
    expect(await fondo()).not.toBe("rgb(252, 252, 252)");
  });

  test("botón fijo de reservar en móvil y datos estructurados del restaurante", async ({ page }) => {
    await page.goto("/es");
    // En la portada aparece cuando la tarjeta de reserva sale de la pantalla.
    await expect(page.locator(".fixed.bottom-0").getByRole("link", { name: "Reservar mesa" })).toHaveCount(0);
    await page.locator("#arroces").scrollIntoViewIfNeeded();
    await expect(page.locator(".fixed.bottom-0").getByRole("link", { name: "Reservar mesa" })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const datos = JSON.parse(ld!);
    expect(datos["@type"]).toBe("Restaurant");
    expect(datos.potentialAction["@type"]).toBe("ReserveAction");
    await page.goto("/es/carta");
    await expect(page.locator(".fixed.bottom-0").getByRole("link", { name: "Reservar mesa" })).toBeVisible();
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
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.match(/<loc>/g)?.length).toBe(27); // 9 páginas × 3 idiomas
    expect(sitemap).toContain("/va/carta");
  });

  test("cada página declara su canonical y sus hreflang (con x-default)", async ({ request }) => {
    for (const ruta of ["", "/carta", "/reservar", "/arroceria", "/aviso-legal"]) {
      for (const l of ["es", "va", "en"]) {
        const html = await (await request.get(`/${l}${ruta}`)).text();
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        expect(canonical && new URL(canonical).pathname, `${l}${ruta}`).toBe(`/${l}${ruta}`);
        const alternos = Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], new URL(m[2]).pathname]));
        expect(alternos, `${l}${ruta}`).toEqual({ es: `/es${ruta}`, "ca-ES": `/va${ruta}`, en: `/en${ruta}`, "x-default": `/es${ruta}` });
      }
    }
  });
});
