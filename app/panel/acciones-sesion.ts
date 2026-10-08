"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bloqueado, permitir } from "@/lib/rate-limit";
import { ipCliente } from "@/lib/request";

export async function iniciarSesion(_: unknown, form: FormData): Promise<{ error?: string }> {
  const p = z
    .object({ correo: z.email(), clave: z.string().min(1), siguiente: z.string().optional() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Revisa el correo y la contraseña." };
  const ip = await ipCliente();
  const claveCorreo = `acceso:${p.data.correo.toLowerCase()}`;
  const claveIp = `acceso-ip:${ip}`;
  if ((await bloqueado(claveCorreo, 5, 900)) || (await bloqueado(claveIp, 20, 900))) {
    return { error: "Demasiados intentos. Espera 15 minutos." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: p.data.correo, password: p.data.clave });
  if (error || !data.user) {
    // Solo los fallos cuentan para el límite.
    await permitir(claveCorreo, 5, 900);
    await permitir(claveIp, 20, 900);
    return { error: "Correo o contraseña incorrectos." };
  }
  const { data: perfil } = await supabase.from("usuario").select("activo, debe_cambiar_clave").eq("id", data.user.id).maybeSingle();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return { error: "Tu usuario no tiene acceso al panel." };
  }
  const destino = p.data.siguiente?.startsWith("/panel") && !p.data.siguiente.startsWith("//") ? p.data.siguiente : "/panel";
  redirect(perfil.debe_cambiar_clave ? "/panel/clave" : destino);
}

export async function cambiarClave(_: unknown, form: FormData): Promise<{ error?: string }> {
  const p = z
    .object({ clave: z.string().min(10), repetir: z.string() })
    .refine((d) => d.clave === d.repetir, { path: ["repetir"] })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "La contraseña debe tener al menos 10 caracteres y coincidir en los dos campos." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: p.data.clave });
  if (error) return { error: error.message.includes("same") ? "Usa una contraseña distinta de la anterior." : "No se ha podido cambiar la contraseña." };
  await supabase.rpc("clave_cambiada");
  redirect("/panel");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/panel/acceso");
}
