import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Límite de intentos por clave en una ventana de tiempo (persistido en la base). */
export async function permitir(clave: string, maximo: number, ventanaSeg: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("consumir_intento", {
    p_clave: clave,
    p_maximo: maximo,
    p_ventana_seg: ventanaSeg,
  });
  if (error) {
    console.error("limite de intentos", error);
    return true;
  }
  return data === true;
}
