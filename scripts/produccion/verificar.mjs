// Comprobaciones tras cada despliegue (las ejecuta la CI). Falla si algo no responde
// como debe. No imprime secretos.
//
// Uso: CRON_SECRET=… node scripts/produccion/verificar.mjs https://arroceria-yerga.roberto-baltaretu.workers.dev
const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("Uso: node scripts/produccion/verificar.mjs <url>");
  process.exit(1);
}

const fallos = [];
async function comprobar(nombre, fn) {
  // El Worker recién desplegado puede tardar unos segundos en propagarse.
  for (let intento = 1; intento <= 6; intento++) {
    try {
      const detalle = await fn();
      console.log(`✓ ${nombre}${detalle ? ` (${detalle})` : ""}`);
      return;
    } catch (e) {
      if (intento === 6) {
        console.log(`✗ ${nombre}: ${e.message}`);
        fallos.push(nombre);
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
}

async function estado(ruta, init, esperado) {
  const t0 = Date.now();
  const r = await fetch(base + ruta, { redirect: "manual", ...init });
  if (r.status !== esperado) throw new Error(`HTTP ${r.status}, se esperaba ${esperado}`);
  return { r, ms: Date.now() - t0 };
}

for (const l of ["es", "va", "en"]) {
  await comprobar(`/${l} responde 200`, async () => {
    const { r, ms } = await estado(`/${l}`, {}, 200);
    const html = await r.text();
    if (!html.includes("Yerga")) throw new Error("la página no contiene «Yerga»");
    return `${ms} ms`;
  });
}
await comprobar("/es/reservar responde 200", async () => `${(await estado("/es/reservar", {}, 200)).ms} ms`);
await comprobar("/panel/acceso responde 200", async () => `${(await estado("/panel/acceso", {}, 200)).ms} ms`);
await comprobar("/panel sin sesión redirige al acceso", async () => {
  const { r } = await estado("/panel", {}, 307);
  if (!r.headers.get("location")?.includes("/panel/acceso")) throw new Error(`redirige a ${r.headers.get("location")}`);
});
await comprobar("/api/disponibilidad no se cachea", async () => {
  const { r } = await estado("/api/disponibilidad?locale=es", {}, 200);
  const cc = r.headers.get("cache-control") ?? "";
  if (!/no-store|private|max-age=0/.test(cc)) throw new Error(`cache-control: «${cc}»`);
});
await comprobar("/api/cron/tick sin secreto → 401", async () => {
  await estado("/api/cron/tick", { method: "POST" }, 401);
});
if (process.env.CRON_SECRET) {
  await comprobar("/api/cron/tick con secreto → 200", async () => {
    await estado("/api/cron/tick", { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, 200);
  });
}

if (fallos.length) {
  console.error(`\n${fallos.length} comprobación(es) fallida(s).`);
  process.exit(1);
}
console.log("\nProducción verificada.");
