#!/usr/bin/env node
/**
 * Vista navegable estática de la web y del panel para GitHub Pages.
 *
 * Recorre la app (servidor local con Supabase local y los datos de ejemplo), guarda el HTML
 * ya pintado de cada página sin sus scripts y reescribe los enlaces para que funcionen bajo
 * la ruta del sitio de Pages. Se puede navegar entre páginas, pero nada funciona: no hay
 * base de datos detrás. Los datos son los de `supabase/seed.sql` (no son reales).
 *
 *   node scripts/vista-previa/estatica.mjs [carpeta-salida]
 *
 * Variables: VISTA_URL (por defecto http://localhost:3100), VISTA_BASE (por defecto
 * /Yerga-rest, la ruta del sitio en GitHub Pages), DATABASE_URL.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import pg from "pg";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const URL_APP = (process.env.VISTA_URL ?? "http://localhost:3100").replace(/\/$/, "");
const BASE = (process.env.VISTA_BASE ?? "/Yerga-rest").replace(/\/$/, "");
const SALIDA = path.resolve(process.argv[2] ?? path.join(raiz, "out-vista"));
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ADMIN = { correo: "administrador@yerga.test", clave: "Yerga-Admin-2026" };

const IDIOMAS = ["es", "va", "en"];
const PUBLICAS = ["", "/carta", "/arroceria", "/paella-valenciana", "/comidas-de-grupo", "/reservar", "/aviso-legal", "/privacidad", "/cookies"];

const AVISO = `<div style="position:fixed;z-index:9999;left:0;right:0;bottom:0;padding:6px 12px;background:#1f3f99;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center">
Vista previa estática con datos de ejemplo: se navega entre páginas, pero no hay nada funcionando detrás.
<a href="${BASE}/" style="color:#fff;text-decoration:underline;margin-left:8px">Índice</a></div>`;

/** Ruta de la app → archivo: «/es/carta» → «es/carta/index.html» (Pages sirve la carpeta). */
function archivoDe(ruta) {
  const limpia = ruta.replace(/^\//, "").replace(/\/$/, "");
  return limpia ? `${limpia}/index.html` : "index.html";
}

/** Quita los scripts y lleva las rutas absolutas bajo la base del sitio. */
function estatizar(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel="(?:modulepreload|preload)"[^>]*as="script"[^>]*>/gi, "")
    .replace(/<link\b[^>]*as="script"[^>]*rel="(?:modulepreload|preload)"[^>]*>/gi, "")
    .replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`)
    .replace(/\bsrcset="([^"]*)"/g, (_, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${BASE}/`)}"`)
    .replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${BASE}/`)
    .replace("</body>", `${AVISO}</body>`);
}

async function guardar(page, ruta, destino = ruta) {
  // Los lienzos (el mapa de mesas) no sobreviven al HTML: se guardan como imagen.
  await page.evaluate(() => {
    for (const c of document.querySelectorAll("canvas")) {
      try {
        const img = document.createElement("img");
        img.src = c.toDataURL("image/png");
        img.alt = "";
        img.style.cssText = c.style.cssText;
        img.style.width = `${c.clientWidth}px`;
        img.style.height = `${c.clientHeight}px`;
        c.replaceWith(img);
      } catch {
        /* lienzo protegido: se deja vacío */
      }
    }
  });
  const html = estatizar(await page.content());
  const archivo = path.join(SALIDA, archivoDe(destino));
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, html);
  console.log(`  ✓ ${destino || "/"}`);
}

async function esperarPanel(page) {
  await page.waitForLoadState("load");
  await page.getByRole("status").filter({ hasText: "Cargando" }).first().waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

function indice() {
  const enlace = (ruta, texto) => `<li><a href="${BASE}${ruta}/">${texto}</a></li>`;
  const web = IDIOMAS.map(
    (i) => `<section><h2>Web pública · ${i.toUpperCase()}</h2><ul>${[
      ["", "Portada"], ["/carta", "Carta"], ["/arroceria", "La arrocería"], ["/paella-valenciana", "Paella valenciana"],
      ["/comidas-de-grupo", "Comidas de grupo"], ["/reservar", "Reservar (primer paso)"], ["/aviso-legal", "Aviso legal"],
    ].map(([r, t]) => enlace(`/${i}${r}`, t)).join("")}</ul></section>`,
  ).join("");
  const panel = [
    ["/panel/acceso", "Acceso"], ["/panel", "Servicio de hoy"], ["/panel/reservas", "Reservas"], ["/panel/reservas/nueva", "Nueva reserva"],
    ["/panel/mapa", "Mapa de mesas"], ["/panel/espera", "Lista de espera"], ["/panel/clientes", "Clientes"], ["/panel/arroces", "Arroces del día"],
    ["/panel/informes", "Informes"], ["/panel/configuracion", "Configuración"], ["/panel/carta", "Carta y contenidos"], ["/panel/usuarios", "Usuarios"],
    ["/panel/registro", "Registro de cambios"], ["/panel/hoja", "Hoja del turno"],
  ].map(([r, t]) => enlace(r, t)).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arrocería Yerga · Vista previa</title><meta name="robots" content="noindex">
<style>body{margin:0;background:#f3eadb;color:#2b1a12;font:16px/1.5 system-ui,sans-serif}main{max-width:960px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:2rem;margin:.2em 0}h2{font-size:1.1rem;margin:1.5em 0 .4em}ul{margin:0;padding-left:1.2em}a{color:#a3471f}
.grid{display:grid;gap:8px 24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.aviso{background:#fff;border-radius:12px;padding:12px 16px}</style></head>
<body><main><h1>Arrocería Yerga · Vista previa</h1>
<p class="aviso">Páginas guardadas de la app con los datos de ejemplo (no reales). Se navega entre ellas, pero no hay nada funcionando detrás: para probar la reserva y el panel de verdad hace falta el despliegue. Generada el ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}.</p>
<p><a href="${BASE}/galeria/"><strong>Galería de capturas</strong></a> (móvil, tableta y escritorio; incluye el flujo de reserva paso a paso).</p>
<div class="grid">${web}<section><h2>Panel</h2><ul>${panel}</ul></section></div></main></body></html>
`;
}

async function main() {
  await rm(SALIDA, { recursive: true, force: true });
  await mkdir(SALIDA, { recursive: true });
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  const navegador = await chromium.launch();
  const page = await navegador.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", locale: "es-ES", timezoneId: "Europe/Madrid" });
  try {
    console.log("Web pública");
    for (const idioma of IDIOMAS) {
      for (const p of PUBLICAS) {
        const ruta = `/${idioma}${p}`;
        await page.goto(`${URL_APP}${ruta}`, { waitUntil: "load" });
        await page.waitForTimeout(500);
        await guardar(page, ruta);
      }
    }

    console.log("Panel");
    await db.query("update usuario set debe_cambiar_clave = false where correo = $1", [ADMIN.correo]);
    await db.query("delete from limite_intentos where clave like 'acceso%'");
    await page.goto(`${URL_APP}/panel/acceso`, { waitUntil: "load" });
    await guardar(page, "/panel/acceso");
    await page.getByLabel("Correo").fill(ADMIN.correo);
    await page.getByLabel("Contraseña").fill(ADMIN.clave);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/panel/acceso"));

    const reservas = (await db.query("select id from reserva where inicio::date = current_date and estado <> 'cancelada' order by inicio")).rows;
    const clientes = (await db.query("select id from cliente where not anonimizado order by ultima_actividad_en desc nulls last limit 12")).rows;
    const mapas = (await db.query("select id from distribucion order by id")).rows;
    const rutas = [
      "/panel", "/panel/reservas", "/panel/reservas/nueva", "/panel/mapa", "/panel/espera", "/panel/clientes",
      "/panel/arroces", "/panel/informes", "/panel/configuracion", "/panel/carta", "/panel/usuarios", "/panel/registro", "/panel/hoja",
      ...reservas.map((r) => `/panel/reservas/${r.id}`),
      ...clientes.map((c) => `/panel/clientes/${c.id}`),
      ...mapas.map((m) => `/panel/mapa/${m.id}`),
    ];
    for (const ruta of rutas) {
      await page.goto(`${URL_APP}${ruta}`);
      await esperarPanel(page);
      await guardar(page, ruta);
    }
  } finally {
    await navegador.close();
    await db.end();
  }

  // Estilos, fuentes e imágenes.
  await cp(path.join(raiz, ".next/static"), path.join(SALIDA, "_next/static"), { recursive: true });
  await cp(path.join(raiz, "public"), SALIDA, { recursive: true });
  for (const f of ["icon.svg"]) await cp(path.join(raiz, "app", f), path.join(SALIDA, f)).catch(() => {});
  await writeFile(path.join(SALIDA, ".nojekyll"), "");
  await writeFile(path.join(SALIDA, "index.html"), indice());
  console.log(`Vista estática en ${path.relative(raiz, SALIDA)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
