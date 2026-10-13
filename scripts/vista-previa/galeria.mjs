#!/usr/bin/env node
/**
 * Genera `docs/vista-previa/index.html`: la galería de capturas con un índice por sección
 * y por tamaño, a partir de los `capturas.json` que deja `capturas.mjs` (local y, si
 * existe, producción).
 *
 *   node scripts/vista-previa/galeria.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = path.join(raiz, "docs/vista-previa");

const TAMANOS = [
  ["movil", "Móvil · 375 px"],
  ["tableta", "Tableta · 768 px"],
  ["escritorio", "Escritorio · 1440 px"],
];
const SECCIONES = [
  ["web-es", "Web pública · castellano"],
  ["reserva-es", "Reserva paso a paso · castellano"],
  ["web-va", "Web pública · valenciano"],
  ["reserva-va", "Reserva paso a paso · valenciano"],
  ["web-en", "Web pública · inglés"],
  ["reserva-en", "Reserva paso a paso · inglés"],
  ["panel", "Panel del restaurante"],
];

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

async function leer(origen) {
  try {
    return JSON.parse(await readFile(path.join(DIR, origen, "capturas.json"), "utf8"));
  } catch {
    return null;
  }
}

function bloque(origen, datos) {
  const fecha = new Date(datos.fecha).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" });
  const secciones = SECCIONES.map(([id, titulo]) => {
    const deSeccion = datos.capturas.filter((c) => c.seccion === id);
    if (!deSeccion.length) return "";
    const paginas = [...new Map(deSeccion.map((c) => [c.pagina, c.titulo])).entries()];
    const filas = paginas
      .map(([pagina, tituloPagina]) => {
        const celdas = TAMANOS.map(([t]) => {
          const c = deSeccion.find((x) => x.pagina === pagina && x.tamano === t);
          if (!c) return `<div class="celda vacia" data-tamano="${t}"></div>`;
          const src = `${origen}/${c.archivo}`;
          return `<a class="celda" data-tamano="${t}" href="${esc(src)}"><img loading="lazy" src="${esc(src)}" alt="${esc(`${tituloPagina} · ${t}`)}"><span>${esc(TAMANOS.find(([x]) => x === t)[1])}</span></a>`;
        }).join("");
        return `<article><h3>${esc(tituloPagina)}</h3><div class="fila">${celdas}</div></article>`;
      })
      .join("");
    return `<section id="${origen}-${id}"><h2>${esc(titulo)}</h2>${filas}</section>`;
  }).join("");
  return { fecha, secciones };
}

async function main() {
  const local = await leer("local");
  const produccion = await leer("produccion");
  if (!local && !produccion) throw new Error("No hay capturas: ejecuta antes scripts/vista-previa/capturas.mjs");
  const bloques = [];
  if (produccion) bloques.push(["produccion", `Producción (${produccion.origen})`, bloque("produccion", produccion)]);
  if (local) bloques.push(["local", "Local con los datos de ejemplo", bloque("local", local)]);

  const indice = bloques
    .map(([origen, titulo]) => `<li><strong>${esc(titulo)}</strong><ul>${SECCIONES.map(([id, t]) => `<li><a href="#${origen}-${id}">${esc(t)}</a></li>`).join("")}</ul></li>`)
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Arrocería Yerga · Galería de capturas</title>
<style>
  :root { --fondo:#f3eadb; --tinta:#2b1a12; --suave:#6b5a4e; --acento:#a3471f; --tarjeta:#fff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fondo); color: var(--tinta); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header, main { max-width: 1280px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.9rem; margin: .3em 0 .2em; }
  h2 { font-size: 1.4rem; margin: 2.2em 0 .6em; padding-top: .4em; border-top: 2px solid #d9c9b0; }
  h3 { font-size: 1rem; margin: 1.2em 0 .4em; color: var(--suave); }
  a { color: var(--acento); }
  .nota { color: var(--suave); max-width: 70ch; }
  nav.indice { background: var(--tarjeta); border-radius: 12px; padding: 12px 16px; }
  nav.indice ul { margin: .2em 0; }
  .filtros { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; background: var(--fondo); }
  .filtros button { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #cdb99c; background: var(--tarjeta); font: inherit; cursor: pointer; }
  .filtros button[aria-pressed="true"] { background: var(--tinta); color: #fff; border-color: var(--tinta); }
  .fila { display: grid; grid-template-columns: 1fr 1.6fr 2.4fr; gap: 12px; align-items: start; }
  .celda { display: block; background: var(--tarjeta); border-radius: 10px; padding: 6px; text-decoration: none; color: var(--suave); font-size: .8rem; }
  .celda img { display: block; width: 100%; height: auto; max-height: 520px; object-fit: cover; object-position: top; border-radius: 6px; }
  .celda span { display: block; padding-top: 4px; }
  .vacia { background: transparent; }
  body[data-tamano] .fila { grid-template-columns: minmax(0, 1fr); max-width: 900px; }
  body[data-tamano="movil"] .fila { max-width: 420px; }
  body[data-tamano] .celda img { max-height: none; }
  body[data-tamano="movil"] .celda:not([data-tamano="movil"]),
  body[data-tamano="tableta"] .celda:not([data-tamano="tableta"]),
  body[data-tamano="escritorio"] .celda:not([data-tamano="escritorio"]) { display: none; }
  @media (max-width: 700px) { .fila { grid-template-columns: minmax(0, 1fr); } }
</style>
</head>
<body>
<header>
  <h1>Arrocería Yerga · Galería de capturas</h1>
  <p class="nota">Web pública y panel del restaurante en móvil, tableta y escritorio. Datos de ejemplo (no reales): direcciones entre corchetes, carta marcada como «ejemplo» y clientes inventados.
  Toca una captura para verla a tamaño completo. Las capturas se regeneran con <code>scripts/vista-previa/capturas.mjs</code> y esta página con <code>scripts/vista-previa/galeria.mjs</code>.</p>
  ${bloques.map(([, titulo, b]) => `<p class="nota">${esc(titulo)}: capturas del ${esc(b.fecha)}.</p>`).join("")}
  <nav class="indice" aria-label="Índice"><ul>${indice}</ul></nav>
</header>
<main>
  <div class="filtros" role="group" aria-label="Tamaño">
    <button type="button" data-filtro="" aria-pressed="true">Todos los tamaños</button>
    ${TAMANOS.map(([t, nombre]) => `<button type="button" data-filtro="${t}" aria-pressed="false">${esc(nombre)}</button>`).join("")}
  </div>
  ${bloques.map(([, , b]) => b.secciones).join("")}
</main>
<script>
  for (const b of document.querySelectorAll("[data-filtro]")) {
    b.addEventListener("click", () => {
      const t = b.dataset.filtro;
      if (t) document.body.dataset.tamano = t; else delete document.body.dataset.tamano;
      for (const x of document.querySelectorAll("[data-filtro]")) x.setAttribute("aria-pressed", String(x === b));
    });
  }
</script>
</body>
</html>
`;
  await writeFile(path.join(DIR, "index.html"), html);
  console.log("docs/vista-previa/index.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
