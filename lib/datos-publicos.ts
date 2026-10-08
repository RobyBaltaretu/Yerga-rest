import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/publico";
import type { Tables } from "@/lib/supabase/types";

export type Plato = Tables<"plato">;
export type Multilingue = { es?: string; va?: string; en?: string };

export const getConfig = cache(async () => {
  const { data } = await createPublicClient()
    .from("configuracion")
    .select(
      "max_comensales_online, antelacion_max_dias, nombre_local, direccion, localidad, codigo_postal, telefono, whatsapp, correo, latitud, longitud, url_mapa, url_resenas, aparcamiento, razon_social, cif, domicilio_social",
    )
    .eq("id", 1)
    .single();
  return data!;
});

export const getZonas = cache(async () => {
  const { data } = await createPublicClient()
    .from("zona")
    .select("id, nombre, slug, orden")
    .eq("activa", true)
    .order("orden");
  return data ?? [];
});

export const getPlatos = cache(async () => {
  const { data } = await createPublicClient()
    .from("plato")
    .select("*")
    .eq("visible", true)
    .order("categoria")
    .order("orden");
  return (data ?? []) as Plato[];
});

export const getContenidos = cache(async () => {
  const { data } = await createPublicClient().from("contenido").select("clave, valor");
  return Object.fromEntries((data ?? []).map((c) => [c.clave, c.valor as Multilingue]));
});

export const getTurnos = cache(async () => {
  const { data } = await createPublicClient()
    .from("turno")
    .select("nombre, dia_semana, inicio, fin, ultima_hora")
    .eq("activo", true)
    .order("dia_semana")
    .order("inicio");
  return data ?? [];
});

export const getResenas = cache(async () => {
  const { data } = await createPublicClient()
    .from("resena")
    .select("*")
    .eq("visible", true)
    .order("orden");
  return data ?? [];
});
