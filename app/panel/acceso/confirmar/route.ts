import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace de recuperación de contraseña. Abre la sesión con el código del
 * enlace y lleva a elegir una contraseña nueva; si el enlace ha caducado, vuelve al
 * acceso con un aviso.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const destino = url.clone();
  destino.search = "";
  if (ok) {
    destino.pathname = "/panel/clave";
  } else {
    destino.pathname = "/panel/acceso";
    destino.searchParams.set("error", "enlace");
  }
  return NextResponse.redirect(destino);
}
