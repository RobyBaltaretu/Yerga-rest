import { expect, test } from "@playwright/test";

test.describe("Base", () => {
  for (const [locale, lang] of [
    ["es", "es"],
    ["va", "ca-ES-valencia"],
    ["en", "en"],
  ] as const) {
    test(`la portada responde en /${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("la raíz redirige a un idioma", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(es|va|en)$/);
  });
});
