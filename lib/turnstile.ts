import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Verifica el token de Cloudflare Turnstile. Sin clave secreta configurada
 * (desarrollo) se omite la comprobación.
 */
export async function verificarTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = serverEnv().turnstileSecretKey;
  if (!secret) return true;
  if (!token) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip && ip !== "local") body.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
