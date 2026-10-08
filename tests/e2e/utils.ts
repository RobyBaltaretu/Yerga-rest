import { Client } from "pg";
import type { Page, TestInfo } from "@playwright/test";

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    return (await c.query<T>(query, params)).rows;
  } finally {
    await c.end();
  }
}

export function soloEn(testInfo: TestInfo, proyecto: "movil" | "tableta") {
  return testInfo.project.name !== proyecto;
}

/** Correo único por prueba, para localizar y limpiar lo que crea. */
export function correoPrueba(nombre: string) {
  return `e2e-${nombre}-${Date.now()}@example.com`;
}

export async function limpiarPorCorreo(correo: string) {
  await sql("delete from reserva where correo = $1", [correo]);
  await sql("delete from lista_espera where correo = $1", [correo]);
}

/** Elige el primer día con mesa en el calendario (avanza meses si hace falta). */
export async function elegirPrimerDiaLibre(page: Page) {
  for (let i = 0; i < 3; i++) {
    const libre = page.locator('button[data-estado="disponible"]').first();
    await page.locator('button[data-estado="cargando"]').first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    if (await libre.count()) {
      await libre.click();
      return;
    }
    await page.getByRole("button", { name: /Mes siguiente/ }).click();
  }
  throw new Error("No hay días libres");
}

const claves = {
  administrador: ["administrador@yerga.test", "Yerga-Admin-2026"],
  encargado: ["encargado@yerga.test", "Yerga-Encargado-2026"],
  sala: ["sala@yerga.test", "Yerga-Sala-2026"],
} as const;

/** Entra en el panel con un rol (sin pasar por el cambio de contraseña inicial). */
export async function entrarComo(page: Page, rol: keyof typeof claves, destino = "/panel") {
  const [correo, clave] = claves[rol];
  await sql("update usuario set debe_cambiar_clave = false where correo = $1", [correo]);
  await sql("delete from limite_intentos where clave like 'acceso%'");
  await page.goto(`/panel/acceso?siguiente=${encodeURIComponent(destino)}`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/panel/acceso"));
}
