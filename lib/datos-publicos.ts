import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/publico";
import type { Tables } from "@/lib/supabase/types";

export type Plato = Tables<"plato">;
export type Multilingue = { es?: string; va?: string; en?: string };

/**
 * Ejecuta una consulta pública. Si Supabase no está configurado o no responde (por
 * ejemplo, al compilar en un entorno sin variables, como las vistas previas de Vercel),
 * `connection()` saca la página del prerenderizado en vez de romper el build: se
 * renderizará en cada petición. Si falla también en la petición, se lanza el error.
 */
async function consultar<T>(
  nombre: string,
  fn: () => PromiseLike<{ data: T; error: unknown }>,
): Promise<NonNullable<T>> {
  let fallo: unknown;
  try {
    const { data, error } = await fn();
    if (!error && data !== null && data !== undefined)
      return data as NonNullable<T>;
    fallo = error ?? new Error("sin datos");
  } catch (e) {
    fallo = e;
  }
  await connection();
  throw new Error(`No se pudo leer ${nombre} de Supabase`, { cause: fallo });
}

export const getConfig = cache(() =>
  consultar("configuracion", () =>
    createPublicClient()
      .from("configuracion")
      .select(
        "max_comensales_online, antelacion_max_dias, nombre_local, direccion, localidad, codigo_postal, telefono, whatsapp, correo, latitud, longitud, url_mapa, url_resenas, aparcamiento, razon_social, cif, domicilio_social",
      )
      .eq("id", 1)
      .single(),
  ),
);

export const getZonas = cache(() =>
  consultar("zona", () =>
    createPublicClient()
      .from("zona")
      .select("id, nombre, slug, orden")
      .eq("activa", true)
      .order("orden"),
  ),
);

export const getPlatos = cache(() =>
  consultar("plato", () =>
    createPublicClient()
      .from("plato")
      .select("*")
      .eq("visible", true)
      .order("categoria")
      .order("orden"),
  ),
);

export const getContenidos = cache(async () => {
  const data = await consultar("contenido", () =>
    createPublicClient().from("contenido").select("clave, valor"),
  );
  return Object.fromEntries(data.map((c) => [c.clave, c.valor as Multilingue]));
});

export const getTurnos = cache(() =>
  consultar("turno", () =>
    createPublicClient()
      .from("turno")
      .select("nombre, dia_semana, inicio, fin, ultima_hora")
      .eq("activo", true)
      .order("dia_semana")
      .order("inicio"),
  ),
);

export const getResenas = cache(() =>
  consultar("resena", () =>
    createPublicClient()
      .from("resena")
      .select("*")
      .eq("visible", true)
      .order("orden"),
  ),
);
