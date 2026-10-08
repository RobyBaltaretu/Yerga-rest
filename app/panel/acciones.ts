"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { avisarListaEspera, notificarReserva } from "@/lib/notificaciones";

// Acciones del panel. Usan la sesión del usuario: la base de datos aplica los
// permisos de su rol (RLS y comprobaciones dentro de cada función).

export type Resultado = { ok: boolean; motivo?: string; aviso?: string; puede_forzar?: boolean; conflicto?: string; reserva_id?: string; mesas?: string[] };

const uuid = z.guid();
const estados = ["pendiente", "confirmada", "reconfirmada", "sentada", "finalizada", "cancelada", "no_presentada"] as const;

export async function crearReserva(datos: Record<string, unknown>, forzar = false): Promise<Resultado> {
  const p = z
    .object({
      inicio: z.string().optional(),
      comensales: z.coerce.number().int().min(1).max(200),
      nombre: z.string().trim().max(80).optional(),
      telefono: z.string().trim().max(30).optional(),
      correo: z.union([z.email(), z.literal("")]).optional(),
      origen: z.enum(["telefono", "puerta", "web"]),
      estado: z.enum(["confirmada", "pendiente"]).optional(),
      zona_id: z.guid().optional().or(z.literal("")),
      mesas: z.array(z.guid()).optional(),
      notas: z.string().max(500).optional(),
      notas_internas: z.string().max(500).optional(),
      alergias: z.string().max(300).optional(),
      ocasion: z.string().max(40).optional(),
      tronas: z.coerce.number().int().min(0).max(6).optional(),
      silla_ruedas: z.boolean().optional(),
      duracion_min: z.coerce.number().int().min(15).max(480).optional(),
      idioma: z.enum(["es", "va", "en"]).optional(),
      arroces: z.array(z.object({ plato_id: z.guid(), raciones: z.number().int().min(1) })).optional(),
    })
    .safeParse(datos);
  if (!p.success) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_reserva_personal", { p_datos: p.data, p_forzar: forzar });
  if (error) return { ok: false, motivo: error.code === "42501" ? "permiso" : "error" };
  const r = data as Resultado;
  if (r.ok && r.reserva_id && p.data.origen === "telefono" && p.data.correo) {
    await notificarReserva(r.reserva_id, "confirmacion");
  }
  revalidatePath("/panel", "layout");
  return r;
}

export async function cambiarEstado(reservaId: string, estado: (typeof estados)[number]): Promise<Resultado> {
  if (!uuid.safeParse(reservaId).success || !estados.includes(estado)) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  const { data: antes } = await supabase.from("reserva").select("estado, origen").eq("id", reservaId).maybeSingle();
  const { data, error } = await supabase.rpc("cambiar_estado", { p_reserva: reservaId, p_estado: estado });
  if (error) return { ok: false, motivo: "error" };
  const r = data as Resultado;
  if (r.ok && (estado === "cancelada" || estado === "no_presentada")) {
    if (estado === "cancelada") await notificarReserva(reservaId, "cancelacion");
    await avisarListaEspera(reservaId);
  }
  // Aprobación de una solicitud de grupo: el cliente recibe su confirmación.
  if (r.ok && estado === "confirmada" && antes?.estado === "pendiente") {
    await notificarReserva(reservaId, "confirmacion");
  }
  revalidatePath("/panel", "layout");
  return r;
}

export async function asignarMesas(reservaId: string, mesas: string[], forzar = false): Promise<Resultado> {
  if (!uuid.safeParse(reservaId).success || !z.array(uuid).safeParse(mesas).success) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("asignar_reserva", { p_reserva: reservaId, p_mesas: mesas, p_forzar: forzar });
  if (error) return { ok: false, motivo: "error" };
  revalidatePath("/panel", "layout");
  return data as Resultado;
}

export async function mesasValidas(reservaId: string) {
  if (!uuid.safeParse(reservaId).success) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("mesas_validas", { p_reserva: reservaId });
  return (data ?? []) as { mesa_id: string; valida: boolean; motivo: string | null; conflicto: string | null }[];
}

export async function modificarReserva(reservaId: string, datos: { [k: string]: Json | undefined }, forzar = false): Promise<Resultado> {
  if (!uuid.safeParse(reservaId).success) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  // La hora llega como fecha y hora locales (Valencia); la base la convierte.
  if (typeof datos.fecha === "string" && typeof datos.hora === "string") {
    const { data: inicio } = await supabase.rpc("hora_local", { p_fecha: datos.fecha, p_hora: datos.hora });
    datos = { ...datos, inicio: inicio as string };
    delete datos.fecha;
    delete datos.hora;
  }
  const { data, error } = await supabase.rpc("modificar_reserva_personal", { p_reserva: reservaId, p_datos: datos as Json, p_forzar: forzar });
  if (error) return { ok: false, motivo: "error" };
  revalidatePath("/panel", "layout");
  return data as Resultado;
}

export async function reorganizarTurno(fecha: string, turno: string, zona: string, aplicar: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reorganizar_turno", { p_fecha: fecha, p_turno: turno, p_zona: zona, p_aplicar: aplicar });
  if (error) return { ok: false, motivo: "error", cambios: 0, plan: [] };
  if (aplicar) revalidatePath("/panel", "layout");
  return data as unknown as {
    ok: boolean;
    motivo?: string;
    cambios: number;
    plan: { reserva_id: string; nombre: string; hora: string; comensales: number; antes: string[]; despues: string[]; cambia: boolean; sin_sitio: boolean }[];
  };
}

/** Bloquea una mesa durante el resto del turno (o el rango indicado). */
export async function bloquearMesa(mesaId: string, desde: string, hasta: string, motivo: string): Promise<Resultado> {
  if (!uuid.safeParse(mesaId).success) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("bloqueo").insert({ mesa_id: mesaId, rango: `[${desde},${hasta})`, motivo: motivo || "Bloqueada en sala", creado_por: user.user?.id });
  if (error) return { ok: false, motivo: "error" };
  revalidatePath("/panel", "layout");
  return { ok: true };
}

export async function desbloquear(bloqueoId: string): Promise<Resultado> {
  if (!uuid.safeParse(bloqueoId).success) return { ok: false, motivo: "datos_invalidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("bloqueo").delete().eq("id", bloqueoId);
  if (error) return { ok: false, motivo: "error" };
  revalidatePath("/panel", "layout");
  return { ok: true };
}

/** Horas posibles para el personal (sin antelación mínima ni límite online). */
export async function horasPersonal(fecha: string, comensales: number) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("horas_disponibles", { p_fecha: fecha, p_comensales: comensales, p_solo_online: false });
  return (data ?? []).map((h) => ({ ...h, inicio: new Date(h.inicio).toISOString() }));
}

export async function guardarNotasCliente(clienteId: string, notas: string, preferencias: string): Promise<Resultado> {
  if (!uuid.safeParse(clienteId).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("cliente").update({ notas_internas: notas || null, preferencias: preferencias || null }).eq("id", clienteId);
  revalidatePath("/panel/clientes");
  return { ok: !error };
}

export async function cambiarEstadoEspera(id: string, estado: "esperando" | "avisado" | "atendido" | "cancelado"): Promise<Resultado> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("lista_espera").update({ estado }).eq("id", id);
  revalidatePath("/panel/espera");
  return { ok: !error };
}
