import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sin caché incremental: todas las páginas con datos se renderizan en cada petición
// y las estáticas se sirven como recursos. Así la disponibilidad nunca se cachea.
export default defineCloudflareConfig({});
