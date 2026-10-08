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
