import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "administrador" | "encargado" | "sala";
export type Sesion = { id: string; nombre: string; correo: string; rol: Rol; debe_cambiar_clave: boolean };

/** Usuario del panel con su rol. Redirige al acceso si no hay sesión válida. */
export const getSesion = cache(async (): Promise<Sesion> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/panel/acceso");
  const { data: perfil } = await supabase
    .from("usuario")
    .select("id, nombre, correo, rol, activo, debe_cambiar_clave")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || !perfil.activo) redirect("/panel/acceso?error=sin_permiso");
  return perfil as Sesion;
});

export const puedeGestionar = (rol: Rol) => rol === "administrador" || rol === "encargado";

/** Para páginas solo de encargado o administrador. */
export async function exigirGestion() {
  const s = await getSesion();
  if (!puedeGestionar(s.rol)) redirect("/panel?error=permiso");
  return s;
}

export async function exigirAdmin() {
  const s = await getSesion();
  if (s.rol !== "administrador") redirect("/panel?error=permiso");
  return s;
}
