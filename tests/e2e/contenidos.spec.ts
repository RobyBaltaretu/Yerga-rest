import { expect, test } from "@playwright/test";
import { entrarComo, soloEn, sql } from "./utils";

test.describe("Contenidos y configuración (tableta)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "tableta"), "El panel se prueba en tableta");
  });

  test("un cambio de precio se ve en la web al momento", async ({ page }) => {
    const [{ precio }] = await sql<{ precio: string }>("select precio from plato where slug = 'esgarraet'");
    try {
      await entrarComo(page, "encargado", "/panel/carta");
      const input = page.getByLabel("Precio de Esgarraet");
      await input.fill("11.75");
      await input.blur();
      await expect(page.getByText("Precio de Esgarraet actualizado")).toBeVisible();
      await page.goto("/es/carta");
      await expect(page.locator("li", { hasText: "Esgarraet" })).toContainText("11,75");
    } finally {
      await sql("update plato set precio = $1 where slug = 'esgarraet'", [precio]);
    }
  });

  test("un bloqueo de día se refleja en la web al momento", async ({ page }) => {
    const [{ fecha }] = await sql<{ fecha: string }>(
      `select to_char(d, 'YYYY-MM-DD') fecha from generate_series(current_date + 10, current_date + 16, interval '1 day') d where extract(dow from d) = 6 limit 1`,
    );
    try {
      await entrarComo(page, "encargado", "/panel/configuracion#bloqueos");
      const form = page.locator("#bloqueos form");
      await form.getByLabel("Desde").fill(fecha);
      await form.getByLabel("Hasta").fill(fecha);
      await form.getByLabel("Motivo").fill("e2e-vacaciones");
      await form.getByRole("button", { name: "Bloquear" }).click();
      await expect(page.getByText(/Bloqueo creado/)).toBeVisible();

      await page.goto("/es/reservar");
      await page.getByRole("button", { name: "2 personas", exact: true }).click();
      const mes = Number(fecha.slice(5, 7));
      if (mes !== new Date().getMonth() + 1) await page.getByRole("button", { name: "Mes siguiente" }).click();
      const dia = page.locator("li > button").filter({ hasText: new RegExp(`^${Number(fecha.slice(8, 10))}$`) });
      await expect(dia).toHaveAttribute("data-estado", "cerrado");
      await expect(dia).toBeDisabled();
    } finally {
      await sql("delete from bloqueo where motivo = 'e2e-vacaciones'");
    }
  });

  test("el administrador crea un usuario de sala que debe cambiar su contraseña", async ({ page }) => {
    const correo = `e2e-sala-${Date.now()}@example.com`;
    try {
      await entrarComo(page, "administrador", "/panel/usuarios");
      const form = page.locator("form", { hasText: "Nuevo usuario" });
      await form.getByLabel("Nombre").fill("Camarera E2E");
      await form.getByLabel("Correo").fill(correo);
      await form.getByLabel("Contraseña provisional").fill("Provisional-2026");
      await form.getByRole("button", { name: "Crear usuario" }).click();
      await expect(page.getByText(/Usuario creado/)).toBeVisible();
      const [u] = await sql<{ rol: string; debe_cambiar_clave: boolean }>("select rol, debe_cambiar_clave from usuario where correo = $1", [correo]);
      expect(u).toEqual({ rol: "sala", debe_cambiar_clave: true });

      // Al entrar, se le pide cambiar la contraseña.
      await page.context().clearCookies();
      await page.goto("/panel/acceso");
      await page.getByLabel("Correo").fill(correo);
      await page.getByLabel("Contraseña").fill("Provisional-2026");
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page.getByRole("heading", { name: "Nueva contraseña" })).toBeVisible();
    } finally {
      await sql("delete from auth.users where email = $1", [correo]);
    }
  });

  test("la sala no ve configuración, carta ni usuarios", async ({ page }) => {
    await entrarComo(page, "sala", "/panel/configuracion");
    await expect(page).toHaveURL(/\/panel\?error=permiso/);
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
  });
});
