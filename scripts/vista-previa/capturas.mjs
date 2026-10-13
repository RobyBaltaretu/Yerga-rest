#!/usr/bin/env node
/**
 * Capturas de la web pública y del panel en móvil (375), tableta (768) y escritorio (1440)
 * para la galería de `docs/vista-previa/`.
 *
 *   node scripts/vista-previa/capturas.mjs                       # local (pnpm start en :3100)
 *   CAPTURAS_URL=https://… node scripts/vista-previa/capturas.mjs  # producción (solo web pública)
 *
 * En local entra al panel con el administrador de ejemplo de `supabase/seed.sql` (no son
 * credenciales reales) y recorre el flujo de reserva completo en los tres idiomas. Contra
 * producción solo captura lo público y el acceso al panel: ni crea reservas ni inicia sesión.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import pg from "pg";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.CAPTURAS_URL ?? "http://localhost:3100").replace(/\/$/, "");
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
const DESTINO = path.join(raiz, "docs/vista-previa", LOCAL ? "local" : "produccion");
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const TAMANOS = [
  { id: "movil", ancho: 375, alto: 812, tactil: true },
  { id: "tableta", ancho: 768, alto: 1024, tactil: true },
  { id: "escritorio", ancho: 1440, alto: 900, tactil: false },
];
const IDIOMAS = ["es", "va", "en"];
const ADMIN = { correo: "administrador@yerga.test", clave: "Yerga-Admin-2026" };

/** @type {{ seccion: string; pagina: string; titulo: string; tamano: string; archivo: string }[]} */
const capturas = [];

async function capturar(page, { seccion, pagina, titulo, tamano, completa = false }) {
  const archivo = `${seccion}/${pagina}-${tamano}.jpg`;
  await mkdir(path.join(DESTINO, seccion), { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(DESTINO, archivo), fullPage: completa, type: "jpeg", quality: 72, animations: "disabled" });
  capturas.push({ seccion, pagina, titulo, tamano, archivo });
  console.log(`  ✓ ${archivo}`);
}

/** Espera a que el panel termine de cargar sus datos (sin «Cargando…»). */
async function panelListo(page) {
  await page.waitForLoadState("load");
  await page.getByRole("status").filter({ hasText: "Cargando" }).first().waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function irA(page, ruta) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: "load" });
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------------------
// Web pública
// ---------------------------------------------------------------------------------------
async function webPublica(page, tamano, idioma) {
  const sec = `web-${idioma}`;
  await irA(page, `/${idioma}`);
  await capturar(page, { seccion: sec, pagina: "01-portada", titulo: "Portada (primera pantalla)", tamano });
  await capturar(page, { seccion: sec, pagina: "02-portada-completa", titulo: "Portada completa", tamano, completa: true });
  for (const [ancla, pagina, titulo] of [
    ["arroces", "03-arroces", "Arroces"],
    ["casa", "05-la-casa", "La casa"],
    ["llegar", "06-contacto", "Contacto y cómo llegar"],
  ]) {
    await page.locator(`#${ancla}`).scrollIntoViewIfNeeded();
    await page.evaluate((a) => document.getElementById(a)?.scrollIntoView({ block: "start" }), ancla);
    await page.waitForTimeout(700);
    await capturar(page, { seccion: sec, pagina, titulo, tamano });
  }
  await irA(page, `/${idioma}/carta`);
  await capturar(page, { seccion: sec, pagina: "04-carta", titulo: "Carta", tamano, completa: true });
  await irA(page, `/${idioma}/paella-valenciana`);
  await capturar(page, { seccion: sec, pagina: "07-paella-valenciana", titulo: "Página «Paella valenciana»", tamano });
  await irA(page, `/${idioma}/comidas-de-grupo`);
  await capturar(page, { seccion: sec, pagina: "08-grupos", titulo: "Página «Comidas de grupo»", tamano });
}

/** Día libre a partir de mañana en el calendario (como en las pruebas e2e). */
async function elegirDia(page) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  for (let i = 0; i < 3; i++) {
    await page.locator('button[data-estado="cargando"]').first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    const fechas = await page.locator('button[data-estado="disponible"]').evaluateAll((b) => b.map((x) => x.getAttribute("data-fecha") ?? ""));
    const fecha = fechas.find((f) => f > hoy);
    if (fecha) return page.locator(`button[data-fecha="${fecha}"]`).click();
    await page.locator('button[aria-label*="…"], button').filter({ hasText: "›" }).first().click().catch(() => {});
  }
  throw new Error("No hay días libres");
}

async function flujoReserva(page, tamano, idioma, m) {
  const sec = `reserva-${idioma}`;
  const r = m.reserva;
  await irA(page, `/${idioma}/reservar`);
  await capturar(page, { seccion: sec, pagina: "1-personas", titulo: "Paso 1: personas", tamano });
  await page.getByRole("group", { name: r.comensales.titulo }).getByRole("button").nth(1).click();
  await page.waitForTimeout(500);
  await capturar(page, { seccion: sec, pagina: "2-dia", titulo: "Paso 1: elegir día", tamano });
  await elegirDia(page);
  await page.getByRole("heading", { name: r.horas.titulo }).waitFor();
  await page.waitForTimeout(500);
  await capturar(page, { seccion: sec, pagina: "3-hora", titulo: "Paso 2: hora", tamano });
  await page.locator("ul >> button:not([aria-label*='" + r.horas.completa + "'])").first().click();

  const zona = page.getByRole("heading", { name: r.zona.titulo });
  const arroz = page.getByRole("heading", { name: r.arroz.titulo });
  const datos = page.getByRole("heading", { name: r.datos.titulo });
  await zona.or(arroz).or(datos).waitFor();
  if (await zona.isVisible()) {
    await capturar(page, { seccion: sec, pagina: "4-zona", titulo: "Paso 3: zona", tamano });
    await page.getByRole("button", { name: r.zona.sala, exact: true }).click();
  }
  await arroz.or(datos).waitFor();
  if (await arroz.isVisible()) {
    await page.getByRole("button", { name: new RegExp(`^${r.arroz.elegir} `) }).first().click();
    await page.waitForTimeout(300);
    await capturar(page, { seccion: sec, pagina: "5-arroz", titulo: "Paso 4: arroz por encargo", tamano });
    await page.getByRole("button", { name: r.continuar }).click();
  }
  await datos.waitFor();
  await page.getByLabel(r.datos.nombre, { exact: true }).fill("Marta Ejemplo");
  await page.getByLabel(r.datos.telefono).fill(`6${String(Date.now()).slice(-8)}`);
  await page.getByLabel(r.datos.correo).fill(`galeria-${idioma}-${tamano}@example.com`);
  await page.getByLabel(new RegExp(r.datos.privacidad.split("<link>")[0].trim().slice(0, 12))).check();
  await capturar(page, { seccion: sec, pagina: "6-datos", titulo: "Paso 5: datos", tamano });
  await page.getByRole("button", { name: r.datos.reservar }).click();
  await page.getByRole("heading", { name: r.ok.titulo }).waitFor({ timeout: 20_000 });
  await capturar(page, { seccion: sec, pagina: "7-confirmada", titulo: "Reserva confirmada", tamano });
  await page.getByRole("link", { name: r.ok.gestionar }).click();
  await page.waitForLoadState("load");
  await page.waitForTimeout(600);
  await capturar(page, { seccion: sec, pagina: "8-gestion", titulo: "Ver, cambiar o cancelar (enlace del correo)", tamano });
}

// ---------------------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------------------
async function panel(page, tamano, db) {
  const sec = "panel";
  await irA(page, "/panel/acceso");
  await capturar(page, { seccion: sec, pagina: "00-acceso", titulo: "Acceso", tamano });
  if (!LOCAL) return;

  await db.query("update usuario set debe_cambiar_clave = false where correo = $1", [ADMIN.correo]);
  await db.query("delete from limite_intentos where clave like 'acceso%'");
  await page.getByLabel("Correo").fill(ADMIN.correo);
  await page.getByLabel("Contraseña").fill(ADMIN.clave);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/panel/acceso"));

  const { rows: dist } = await db.query("select id from distribucion where activa order by creada_en limit 1").catch(() => ({ rows: [] }));
  const distId = dist[0]?.id ?? (await db.query("select id from distribucion order by id limit 1")).rows[0].id;
  const { rows: cli } = await db.query(
    `select c.id from cliente c join reserva r on r.cliente_id = c.id
      where coalesce(c.correo, '') not like 'galeria-%' group by c.id order by count(*) desc limit 1`,
  );
  const { rows: res } = await db.query("select id from reserva where inicio::date = current_date and estado <> 'cancelada' order by inicio limit 1");

  const pantallas = [
    ["01-servicio-hoy", "Servicio de hoy (mapa y lista)", "/panel", true],
    ["02-reservas", "Reservas", "/panel/reservas", true],
    ["03-reserva-detalle", "Detalle de una reserva", res[0] ? `/panel/reservas/${res[0].id}` : null, false],
    ["04-nueva-reserva", "Nueva reserva por teléfono", "/panel/reservas/nueva", false],
    ["05-mapa", "Mapas de mesas (distribuciones)", "/panel/mapa", false],
    ["06-mapa-edicion", "Editor del mapa de mesas", `/panel/mapa/${distId}`, false],
    ["07-espera", "Lista de espera", "/panel/espera", true],
    ["08-clientes", "Clientes", "/panel/clientes", true],
    ["09-ficha-cliente", "Ficha de cliente", cli[0] ? `/panel/clientes/${cli[0].id}` : null, true],
    ["10-arroces", "Arroces del día", "/panel/arroces", true],
    ["11-informes", "Informes", "/panel/informes", true],
    ["12-configuracion", "Configuración", "/panel/configuracion", false],
    ["13-carta", "Carta y contenidos", "/panel/carta", false],
    ["14-usuarios", "Usuarios", "/panel/usuarios", false],
    ["15-registro", "Registro de cambios", "/panel/registro", false],
    ["16-hoja", "Hoja de servicio imprimible", "/panel/hoja", true],
  ];
  for (const [pagina, titulo, ruta, completa] of pantallas) {
    if (!ruta) continue;
    await page.goto(`${BASE}${ruta}`);
    await panelListo(page);
    await capturar(page, { seccion: sec, pagina, titulo, tamano, completa });
  }

  // El mapa en modo servicio (en móvil y tableta va en su propia pestaña).
  await page.goto(`${BASE}/panel`);
  await panelListo(page);
  const pestanaMapa = page.getByRole("tab", { name: "Mapa", exact: true });
  if (await pestanaMapa.isVisible().catch(() => false)) await pestanaMapa.click();
  await page.waitForTimeout(800);
  await capturar(page, { seccion: sec, pagina: "01b-mapa-servicio", titulo: "Mapa de mesas en servicio", tamano });

  // Reservas en línea de tiempo por mesa.
  await page.goto(`${BASE}/panel/reservas`);
  await panelListo(page);
  const linea = page.getByText("Línea de tiempo", { exact: true });
  if (await linea.count()) {
    await linea.first().click();
    await panelListo(page);
    await capturar(page, { seccion: sec, pagina: "02b-linea-tiempo", titulo: "Reservas en línea de tiempo por mesa", tamano, completa: true });
  }
}

// ---------------------------------------------------------------------------------------
async function main() {
  console.log(`Capturas de ${BASE} → ${path.relative(raiz, DESTINO)}`);
  await rm(DESTINO, { recursive: true, force: true });
  const db = LOCAL ? new pg.Client({ connectionString: DATABASE_URL }) : null;
  if (db) {
    await db.connect();
    // Cada pasada crea 9 reservas: que no las frene el límite de intentos de la web.
    await db.query("delete from limite_intentos");
  }
  const mensajes = Object.fromEntries(
    await Promise.all(IDIOMAS.map(async (i) => [i, JSON.parse(await readFile(path.join(raiz, `messages/${i}.json`), "utf8"))])),
  );
  const navegador = await chromium.launch();
  try {
    for (const t of TAMANOS) {
      console.log(`· ${t.id} (${t.ancho} px)`);
      const ctx = await navegador.newContext({
        viewport: { width: t.ancho, height: t.alto },
        isMobile: t.tactil && t.ancho < 768,
        hasTouch: t.tactil,
        deviceScaleFactor: 1,
        locale: "es-ES",
        timezoneId: "Europe/Madrid",
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      for (const idioma of IDIOMAS) {
        await webPublica(page, t.id, idioma);
        if (LOCAL) await flujoReserva(page, t.id, idioma, mensajes[idioma]);
        else {
          await irA(page, `/${idioma}/reservar`);
          await capturar(page, { seccion: `reserva-${idioma}`, pagina: "1-personas", titulo: "Paso 1: personas", tamano: t.id });
        }
      }
      await panel(page, t.id, db);
      await ctx.close();
    }
  } finally {
    await navegador.close();
    if (db) {
      // Las reservas de la galería no se quedan en la base local.
      await db.query("delete from reserva where correo like 'galeria-%@example.com'");
      await db.query("delete from cliente where correo like 'galeria-%@example.com'");
      await db.query("delete from limite_intentos");
      await db.end();
    }
  }
  await writeFile(
    path.join(DESTINO, "capturas.json"),
    JSON.stringify({ origen: LOCAL ? "local (Supabase local con los datos de ejemplo)" : BASE, fecha: new Date().toISOString(), capturas }, null, 2) + "\n",
  );
  console.log(`${capturas.length} capturas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
