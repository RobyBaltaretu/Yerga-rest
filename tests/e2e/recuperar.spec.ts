import { expect, test } from "@playwright/test";
import { soloEn, sql } from "./utils";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const CORREO = "recuperar-e2e@yerga.test";

/** Último correo recibido en Mailpit (el SMTP de pruebas de Supabase local) para una dirección. */
async function enlaceDeRecuperacion(correo: string): Promise<string> {
  let enlace = "";
  await expect
    .poll(
      async () => {
        const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${correo}`)}&limit=1`);
        const { messages } = (await r.json()) as { messages: { ID: string }[] };
        if (!messages?.length) return false;
        const m = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string; Text: string };
        enlace = (m.HTML || m.Text).match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&") ?? (m.Text.match(/https?:\/\/\S+verify\S+/)?.[0] ?? "");
        return Boolean(enlace);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  return enlace;
}

test.describe("Recuperar la contraseña del panel", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "Un solo proyecto: Supabase local limita los correos por hora");
  });

  test("el enlace del correo lleva a elegir contraseña nueva y entra en el panel", async ({ page }) => {
    await sql("delete from auth.users where email = $1", [CORREO]);
    await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" }).catch(() => {});
    const [{ id }] = await sql<{ id: string }>(
      `with u as (
         insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
           email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
           extensions.crypt('Clave-Olvidada-2026', extensions.gen_salt('bf')), now(),
           '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '')
         returning id)
       select id from u`,
      [CORREO],
    );
    await sql(
      `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`,
      [id, CORREO],
    );
    await sql("insert into usuario (id, nombre, correo, rol, debe_cambiar_clave) values ($1, 'Recuperación E2E', $2, 'sala', false)", [id, CORREO]);
    await sql("delete from limite_intentos where clave like 'recuperar%'");
    try {
      await page.goto("/panel/acceso");
      await page.getByRole("link", { name: "¿Has olvidado tu contraseña?" }).click();
      await page.getByLabel("Correo").fill(CORREO);
      await page.getByRole("button", { name: "Enviar enlace" }).click();
      await expect(page.getByRole("status")).toContainText("recibirás el enlace");

      await page.goto(await enlaceDeRecuperacion(CORREO));
      await expect(page).toHaveURL(/\/panel\/clave$/);
      await page.getByLabel("Contraseña nueva").fill("Clave-Recuperada-2026");
      await page.getByLabel("Repítela").fill("Clave-Recuperada-2026");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page).toHaveURL(/\/panel$/);

      // La respuesta no revela si un correo existe.
      await page.goto("/panel/acceso/recuperar");
      await page.getByLabel("Correo").fill("nadie@example.com");
      await page.getByRole("button", { name: "Enviar enlace" }).click();
      await expect(page.getByRole("status")).toContainText("recibirás el enlace");
    } finally {
      await sql("delete from auth.users where email = $1", [CORREO]);
    }
  });

  test("un enlace caducado vuelve al acceso con aviso", async ({ page }) => {
    await page.goto("/panel/acceso/confirmar?code=no-vale");
    await expect(page).toHaveURL(/\/panel\/acceso\?error=enlace$/);
    await expect(page.getByText("El enlace ha caducado o ya se ha usado")).toBeVisible();
  });
});
