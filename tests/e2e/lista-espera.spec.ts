import { expect, test } from "@playwright/test";
import { soloEn, sql } from "./utils";

const CORREO = "espera-e2e@example.com";

test.describe("Lista de espera con plazo (móvil)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "Flujo del cliente en móvil");
  });

  test("al cancelar una reserva, el primero de la lista recibe la mesa y la acepta con un toque", async ({ page }) => {
    // Un sábado dentro de cuatro semanas, a las 13:00.
    const [{ inicio }] = await sql<{ inicio: string }>(
      `select public.hora_local(d::date, '13:00') inicio
         from generate_series(current_date + 28, current_date + 34, interval '1 day') d
        where extract(dow from d) = 6 limit 1`,
    );
    const [{ r }] = await sql<{ r: { reserva_id: string } }>(
      `select public.crear_reserva_personal(jsonb_build_object('inicio', $1::timestamptz, 'comensales', 2,
         'nombre', 'Cancela E2E', 'telefono', '+34600000999', 'origen', 'telefono'), true) r`,
      [inicio],
    );
    const [{ codigo }] = await sql<{ codigo: string }>("select codigo_gestion codigo from reserva where id = $1", [r.reserva_id]);
    await sql(
      `insert into lista_espera (nombre, telefono, correo, fecha, turno_nombre, comensales, hora_preferida)
       values ('Esperanza E2E', '+34611222333', $1, public.fecha_local($2::timestamptz), 'comida', 2, '13:00')`,
      [CORREO, inicio],
    );
    try {
      // El cliente cancela desde su enlace.
      await page.goto(`/es/reservar/gestion/${codigo}`);
      await page.getByRole("button", { name: "Cancelar reserva" }).click();
      await page.getByRole("button", { name: "Sí, cancelar" }).click();
      await expect(page.getByText("Reserva cancelada")).toBeVisible();

      // A la persona en espera le llega el correo con el plazo y el enlace.
      let enlace = "";
      await expect
        .poll(async () => {
          const [m] = await sql<{ asunto: string; cuerpo_texto: string }>(
            "select asunto, cuerpo_texto from mensaje where destinatario = $1 and tipo = 'lista_espera' order by creado_en desc limit 1",
            [CORREO],
          );
          enlace = m?.cuerpo_texto.match(/https?:\/\/\S+\/reservar\/espera\/[0-9a-f-]{36}/)?.[0] ?? "";
          return m?.asunto ?? "";
        })
        .toContain("15 minutos");
      expect(enlace).not.toBe("");

      await page.goto(new URL(enlace).pathname);
      await expect(page.getByText("te hemos guardado esta mesa")).toBeVisible();
      await page.getByRole("button", { name: "Aceptar la mesa" }).click();
      await expect(page).toHaveURL(/\/es\/reservar\/gestion\//);
      await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();

      const [entrada] = await sql<{ estado: string; reserva_id: string }>("select estado, reserva_id from lista_espera where correo = $1", [CORREO]);
      expect(entrada.estado).toBe("atendido");
      const [nueva] = await sql<{ nombre: string; estado: string }>("select nombre, estado from reserva where id = $1", [entrada.reserva_id]);
      expect(nueva).toEqual({ nombre: "Esperanza E2E", estado: "confirmada" });

      // El mismo enlace, ya usado, lleva a la reserva.
      await page.goto(new URL(enlace).pathname);
      await expect(page.getByRole("link", { name: "Ver mi reserva" })).toBeVisible();
    } finally {
      await sql("delete from reserva where id = $1 or id = (select reserva_id from lista_espera where correo = $2)", [r.reserva_id, CORREO]);
      await sql("delete from lista_espera where correo = $1", [CORREO]);
    }
  });

  test("una oferta caducada lo explica y ofrece buscar otra hora", async ({ page }) => {
    const [{ token }] = await sql<{ token: string }>(
      `insert into lista_espera (nombre, telefono, correo, fecha, turno_nombre, comensales, estado, oferta_token, oferta_inicio, oferta_hasta)
       values ('Tarde E2E', '+34611222444', $1, current_date + 30, 'comida', 2, 'avisado', gen_random_uuid(), now() + interval '30 days', now() - interval '1 minute')
       returning oferta_token token`,
      [CORREO],
    );
    try {
      await page.goto(`/va/reservar/espera/${token}`);
      await expect(page.getByText("Esta oferta ja no està disponible")).toBeVisible();
      await expect(page.getByRole("link", { name: "Buscar una altra hora" })).toBeVisible();
    } finally {
      await sql("delete from lista_espera where correo = $1", [CORREO]);
    }
  });
});
