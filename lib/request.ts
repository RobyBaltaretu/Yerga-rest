import "server-only";
import { headers } from "next/headers";

/** IP del cliente (Cloudflare la da en cf-connecting-ip). */
export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}
