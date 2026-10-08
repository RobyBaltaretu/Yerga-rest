// Comprueba que ningún secreto acaba en lo que se envía al navegador (.next/static y, si
// existe, .open-next/assets). Falla si encuentra:
//   - el valor de algún secreto de ejecución presente en el entorno;
//   - un JWT de Supabase con rol service_role o una clave sb_secret_;
//   - una clave de Resend (re_…) o un token de API de Cloudflare.
// Uso: node scripts/seguridad/sin-secretos.mjs   (lo ejecuta la CI tras el build)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const carpetas = [".next/static", ".open-next/assets"].filter(existsSync);
if (!carpetas.length) {
  console.error("No hay build: ejecuta antes `pnpm build`.");
  process.exit(1);
}

const secretos = ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "CRON_SECRET", "SUPABASE_DB_PASSWORD", "CLOUDFLARE_API_TOKEN", "SUPABASE_ACCESS_TOKEN"]
  .map((n) => [n, process.env[n]])
  .filter(([, v]) => v && v.length >= 8);

const patrones = [
  ["clave secreta de Supabase", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["clave de Resend", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/],
];

function* archivos(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else if (/\.(js|mjs|cjs|html|json|txt|css|map)$/.test(n)) yield p;
  }
}

/** ¿Algún JWT del texto es de rol service_role? */
function jwtDeServicio(texto) {
  for (const m of texto.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      if (JSON.parse(Buffer.from(m[1], "base64url").toString()).role === "service_role") return true;
    } catch {}
  }
  return false;
}

const hallazgos = [];
let revisados = 0;
for (const carpeta of carpetas) {
  for (const f of archivos(carpeta)) {
    const texto = readFileSync(f, "utf8");
    revisados++;
    for (const [nombre, valor] of secretos) if (texto.includes(valor)) hallazgos.push(`${f}: contiene el valor de ${nombre}`);
    for (const [nombre, re] of patrones) if (re.test(texto)) hallazgos.push(`${f}: parece contener una ${nombre}`);
    if (jwtDeServicio(texto)) hallazgos.push(`${f}: contiene un JWT con rol service_role`);
  }
}

if (hallazgos.length) {
  console.error(hallazgos.join("\n"));
  process.exit(1);
}
console.log(`Sin secretos en ${revisados} archivos del cliente (${carpetas.join(", ")}); comprobados ${secretos.length} valores del entorno.`);
