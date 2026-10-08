// Punto de entrada del Worker: el manejador de OpenNext para las peticiones HTTP
// y un manejador `scheduled` para los Cron Triggers. `.open-next/worker.js` lo
// genera `opennextjs-cloudflare build`; este archivo queda fuera de tsc.
import { default as handler } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string };
type Ctx = { waitUntil(p: Promise<unknown>): void };

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller: unknown, env: Env, ctx: Ctx) {
    const base = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost";
    const request = new Request(new URL("/api/cron/tick", base), {
      method: "POST",
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    ctx.waitUntil(handler.fetch(request, env, ctx));
  },
};

export default worker;

export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
