import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Web pública prerenderizada y servida desde Workers KV; al guardar en el panel,
// `revalidatePath` marca las páginas en la caché de etiquetas (D1) y la siguiente visita
// las vuelve a generar. KV y D1 son gratuitos sin tarjeta; R2 no se usa (pide tarjeta).
// Sin los bindings (desarrollo local, pruebas) todo se renderiza en cada petición.
// La disponibilidad (/api/disponibilidad) y la reserva son dinámicas y nunca se cachean.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
