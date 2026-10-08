// Asegura los recursos gratuitos de Cloudflare que usa la caché de la web pública y
// añade sus identificadores a wrangler.jsonc en la copia de trabajo de la CI (no se
// sube al repositorio). Es idempotente: si ya existen, solo los lee.
//
//   KV  arroceria-yerga-cache      → NEXT_INC_CACHE_KV  (páginas prerenderizadas)
//   D1  arroceria-yerga-etiquetas  → NEXT_TAG_CACHE_D1  (revalidación al guardar)
//
// Requiere CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID. No usa R2 (pide tarjeta).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const KV = { titulo: "arroceria-yerga-cache", binding: "NEXT_INC_CACHE_KV" };
const D1 = { nombre: "arroceria-yerga-etiquetas", binding: "NEXT_TAG_CACHE_D1" };

const wrangler = (...args) => execFileSync("pnpm", ["-s", "wrangler", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const jsonDe = (texto) => JSON.parse(texto.slice(texto.indexOf("[")));

function kvId() {
  return jsonDe(wrangler("kv", "namespace", "list")).find((n) => n.title === KV.titulo)?.id;
}
function d1Id() {
  return jsonDe(wrangler("d1", "list", "--json")).find((d) => d.name === D1.nombre)?.uuid;
}

let kv = kvId();
if (!kv) {
  wrangler("kv", "namespace", "create", KV.titulo);
  kv = kvId();
  console.log("KV creado:", KV.titulo);
}
let d1 = d1Id();
if (!d1) {
  wrangler("d1", "create", D1.nombre, "--location", "weur");
  d1 = d1Id();
  console.log("D1 creada:", D1.nombre);
}
if (!kv || !d1) {
  console.error("No se han podido crear o encontrar los recursos de caché.");
  process.exit(1);
}

const ruta = "wrangler.jsonc";
const config = readFileSync(ruta, "utf8");
if (config.includes(KV.binding)) {
  console.log("wrangler.jsonc ya tiene los bindings de caché.");
} else {
  const bindings = `  "kv_namespaces": [{ "binding": "${KV.binding}", "id": "${kv}" }],
  "d1_databases": [{ "binding": "${D1.binding}", "database_name": "${D1.nombre}", "database_id": "${d1}" }],
`;
  const salida = config.replace(/\n(\s*)"observability"/, `\n${bindings}$1"observability"`);
  if (salida === config) {
    console.error("No encuentro dónde insertar los bindings en wrangler.jsonc.");
    process.exit(1);
  }
  writeFileSync(ruta, salida);
  console.log("Bindings de caché añadidos a wrangler.jsonc (solo en esta copia).");
}
