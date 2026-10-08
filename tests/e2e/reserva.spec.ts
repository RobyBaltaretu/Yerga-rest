import { expect, test } from "@playwright/test";
import { correoPrueba, elegirPrimerDiaLibre, limpiarPorCorreo, soloEn, sql } from "./utils";

test.describe("Reserva pública (móvil)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "Flujo del cliente: se prueba en móvil");
  });

  test("un cliente reserva en menos de 60 segundos, recibe el correo, modifica y cancela", async ({ page }) => {
    const correo = correoPrueba("flujo");
    try {
      const empieza = Date.now();
      await page.goto("/es/reservar");
      await page.getByRole("button", { name: "2 personas", exact: true }).click();
      await elegirPrimerDiaLibre(page);

      await expect(page.getByRole("heading", { name: "¿A qué hora?" })).toBeVisible();
      const hora = page.locator("ul >> button:not([aria-label*='Completa'])").first();
      await hora.click();

      // Zona (si ambas tienen hueco) y arroz son pasos opcionales.
      const zona = page.getByRole("heading", { name: "¿Dónde preferís?" });
      const arroz = page.getByRole("heading", { name: "Elige tu arroz" });
      const datos = page.getByRole("heading", { name: "Tus datos" });
      await expect(zona.or(arroz).or(datos)).toBeVisible();
      if (await zona.isVisible()) await page.getByRole("button", { name: "Sala" }).click();
      await expect(arroz.or(datos)).toBeVisible();
      if (await arroz.isVisible()) {
        await page.getByRole("button", { name: /Elegir Paella valenciana/ }).click();
        await page.getByRole("button", { name: "Continuar" }).click();
      }

      await expect(datos).toBeVisible();
      await page.getByLabel("Nombre").fill("Prueba E2E");
      await page.getByLabel("Teléfono").fill("600 555 123");
      await page.getByLabel("Correo electrónico").fill(correo);
      await page.getByLabel(/política de privacidad/).check();
      await page.getByRole("button", { name: "Confirmar reserva" }).click();

      await expect(page.getByRole("heading", { name: "¡Mesa reservada!" })).toBeVisible();
      expect(Date.now() - empieza).toBeLessThan(60_000);

      const [reserva] = await sql<{ id: string; codigo_gestion: string; estado: string }>(
        "select id, codigo_gestion, estado from reserva where correo = $1",
        [correo],
      );
      expect(reserva.estado).toBe("confirmada");
      const mensajes = await sql("select tipo, estado from mensaje where reserva_id = $1", [reserva.id]);
      expect(mensajes).toEqual([expect.objectContaining({ tipo: "confirmacion" })]);

      // El cliente cambia su reserva a 3 personas desde el enlace del correo.
      await page.getByRole("link", { name: "Ver, cambiar o cancelar mi reserva" }).click();
      await expect(page.getByRole("heading", { name: "Tu reserva" })).toBeVisible();
      await page.getByRole("button", { name: "Cambiar día, hora o personas" }).click();
      await page.getByRole("button", { name: "3", exact: true }).click();
      await elegirPrimerDiaLibre(page);
      await page.getByRole("list", { name: "¿A qué hora?" }).getByRole("button").first().click();
      await expect(page.getByText("Reserva actualizada.")).toBeVisible();
      await expect(page.getByText(/3 personas/)).toBeVisible();

      // Y la cancela: la mesa vuelve a ofrecerse.
      await page.getByRole("button", { name: "Cancelar reserva" }).click();
      await page.getByRole("button", { name: "Sí, cancelar" }).click();
      await expect(page.getByText("Reserva cancelada. ¡Esperamos verte pronto!")).toBeVisible();
      const [tras] = await sql<{ estado: string; activas: string }>(
        `select r.estado, (select count(*) from asignacion a where a.reserva_id = r.id and a.activa) activas
           from reserva r where r.id = $1`,
        [reserva.id],
      );
      expect(tras.estado).toBe("cancelada");
      expect(Number(tras.activas)).toBe(0);
    } finally {
      await limpiarPorCorreo(correo);
    }
  });

  test("un día con el turno lleno no ofrece horas", async ({ page }) => {
    // Bloqueamos todas las mesas el primer sábado dentro de 3 semanas.
    const [{ fecha }] = await sql<{ fecha: string }>(
      `select to_char(d, 'YYYY-MM-DD') fecha from generate_series(current_date + 21, current_date + 27, interval '1 day') d
        where extract(dow from d) = 6 limit 1`,
    );
    await sql(
      `insert into bloqueo (rango, mesa_id, motivo)
       select tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), id, 'e2e-lleno'
         from mesa`,
      [fecha],
    );
    try {
      await page.goto("/es/reservar");
      await page.getByRole("button", { name: "2 personas", exact: true }).click();
      const dia = Number(fecha.slice(8, 10));
      const mes = Number(fecha.slice(5, 7));
      const actual = new Date().getMonth() + 1;
      if (mes !== actual) await page.getByRole("button", { name: "Mes siguiente" }).click();
      const boton = page.locator("li > button").filter({ hasText: new RegExp(`^${dia}$`) });
      await expect(boton).toHaveAttribute("data-estado", "completo");
      await expect(boton).toBeDisabled();
      await expect(boton).toHaveAccessibleName(/Completo/);
    } finally {
      await sql("delete from bloqueo where motivo = 'e2e-lleno'");
    }
  });

  test("más de 10 personas lleva a la solicitud de grupo", async ({ page }) => {
    const correo = correoPrueba("grupo");
    try {
      await page.goto("/es/reservar");
      await page.getByRole("button", { name: "Más de 10" }).click();
      await expect(page.getByRole("heading", { name: "Solicitud de grupo" })).toBeVisible();
      const [{ fecha }] = await sql<{ fecha: string }>("select to_char(current_date + 30, 'YYYY-MM-DD') fecha");
      await page.getByLabel("Día").fill(fecha);
      await page.getByLabel("Nombre").fill("Peña E2E");
      await page.getByLabel("Teléfono").fill("611222333");
      await page.getByLabel("Correo electrónico").fill(correo);
      await page.getByLabel(/política de privacidad/).check();
      await page.getByRole("button", { name: "Enviar solicitud" }).click();
      await expect(page.getByText(/Te confirmaremos la reserva/)).toBeVisible();
      const [r] = await sql<{ estado: string; comensales: number }>("select estado, comensales from reserva where correo = $1", [correo]);
      expect(r).toEqual({ estado: "pendiente", comensales: 11 });
    } finally {
      await limpiarPorCorreo(correo);
    }
  });
});
