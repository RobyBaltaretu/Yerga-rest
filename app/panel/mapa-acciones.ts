"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { esquemaBorrador, type Borrador } from "@/lib/panel/borrador";

// Acciones del editor de distribuciones (encargado y administrador; la base
// de datos lo comprueba de nuevo).

const id = z.guid();


export async function guardarBorrador(distId: string, borrador: Borrador) {
  const p = esquemaBorrador.safeParse(borrador);
  if (!id.safeParse(distId).success || !p.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("guardar_borrador", { p_dist: distId, p_borrador: p.data as unknown as Json });
  return { ok: !error };
}

export type ResultadoPublicar = {
  ok: boolean;
  publicada: boolean;
  motivo?: string | null;
  reasignadas?: number;
  sin_sitio?: number;
  reservas?: { reserva_id: string; nombre: string; comensales: number; fecha: string; hora: string; situacion: "reasignada" | "sin_sitio"; antes: string[]; despues: string[] }[];
};

export async function publicar(distId: string, aplicar: boolean): Promise<ResultadoPublicar> {
  if (!id.safeParse(distId).success) return { ok: false, publicada: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publicar_distribucion", { p_dist: distId, p_aplicar: aplicar });
  if (error) return { ok: false, publicada: false, motivo: error.message };
  if (aplicar) revalidatePath("/panel", "layout");
  return data as unknown as ResultadoPublicar;
}

export async function descartarBorrador(distId: string) {
  const supabase = await createClient();
  await supabase.rpc("descartar_borrador", { p_dist: distId });
  revalidatePath("/panel/mapa", "layout");
}

export async function crearDistribucion(zonaId: string, nombre: string, copiarDe?: string) {
  if (!id.safeParse(zonaId).success || !nombre.trim()) return { ok: false as const };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_distribucion", { p_zona: zonaId, p_nombre: nombre.trim(), p_copiar_de: copiarDe || undefined });
  if (error) return { ok: false as const, motivo: error.code === "23505" ? "Ya existe una distribución con ese nombre" : error.message };
  revalidatePath("/panel/mapa");
  return { ok: true as const, id: data as string };
}

export async function hacerPredeterminada(distId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("hacer_predeterminada", { p_dist: distId });
  revalidatePath("/panel", "layout");
  return { ok: !error, motivo: error?.message };
}

export async function renombrar(distId: string, nombre: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("distribucion").update({ nombre: nombre.trim() }).eq("id", distId);
  revalidatePath("/panel/mapa", "layout");
  return { ok: !error };
}

export async function borrarDistribucion(distId: string) {
  const supabase = await createClient();
  const { data: d } = await supabase.from("distribucion").select("estado, predeterminada").eq("id", distId).single();
  if (d?.predeterminada) return { ok: false, motivo: "No se puede borrar la distribución predeterminada" };
  const { count } = await supabase.from("asignacion").select("id, mesa!inner(distribucion_id)", { count: "exact", head: true }).eq("mesa.distribucion_id", distId);
  if (count) return { ok: false, motivo: "Tiene reservas asignadas: quítale la programación en lugar de borrarla" };
  const { error } = await supabase.from("distribucion").delete().eq("id", distId);
  revalidatePath("/panel/mapa");
  return { ok: !error };
}

export async function anadirProgramacion(distId: string, regla: { fecha?: string; dia_semana?: number; turno_nombre?: string }) {
  const p = z
    .object({
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dia_semana: z.number().int().min(0).max(6).optional(),
      turno_nombre: z.enum(["comida", "cena"]).optional(),
    })
    .refine((r) => r.fecha || r.dia_semana != null || r.turno_nombre)
    .safeParse(regla);
  if (!p.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("programacion_distribucion").insert({ distribucion_id: distId, ...p.data });
  revalidatePath("/panel", "layout");
  return { ok: !error };
}

export async function quitarProgramacion(reglaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("programacion_distribucion").delete().eq("id", reglaId);
  revalidatePath("/panel", "layout");
  return { ok: !error };
}
