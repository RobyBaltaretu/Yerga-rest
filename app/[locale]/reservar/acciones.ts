"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipCliente } from "@/lib/request";
import { permitir } from "@/lib/rate-limit";
import { verificarTurnstile } from "@/lib/turnstile";
import { avisarListaEspera, notificarReserva } from "@/lib/notificaciones";
import {
  confirmacion,
  erroresPorCampo,
  fechaISO,
  instanteISO,
  listaEspera,
  solicitudGrupo,
} from "@/lib/validation/reserva";

// Todas las acciones de la web pública pasan por aquí: validan con Zod, limitan
// intentos y llaman al motor de la base de datos con la clave de servicio. El
// navegador nunca decide si hay mesa.

export type Alternativa = { inicio: string; hora: string; turno: string };
export type HoraDisponible = { inicio: string; hora: string; turno: string; zonas: string[]; disponible: boolean };
export type DiaDisponible = { fecha: string; estado: "cerrado" | "completo" | "disponible" };
export type ResultadoRetencion =
  | { ok: true; token: string; caduca_en: string; zona_id: string; turno: string }
  | { ok: false; motivo: string; alternativas?: Alternativa[] };
export type ResultadoConfirmacion =
  | { ok: true; codigo: string; inicio: string; fin: string; reserva_id: string }
  | { ok: false; motivo: string; alternativas?: Alternativa[]; errores?: Record<string, string> };

const comensales = z.coerce.number().int().min(1).max(40);

export async function cargarDias(desde: string, hasta: string, n: number): Promise<DiaDisponible[]> {
  const p = z.object({ desde: fechaISO, hasta: fechaISO, n: comensales }).safeParse({ desde, hasta, n });
  if (!p.success) return [];
  const dias = (Date.parse(p.data.hasta) - Date.parse(p.data.desde)) / 86_400_000;
  if (dias < 0 || dias > 45) return [];
  const { data, error } = await createAdminClient().rpc("dias_disponibles", {
    p_desde: p.data.desde,
    p_hasta: p.data.hasta,
    p_comensales: p.data.n,
  });
  if (error) {
    console.error("dias_disponibles", error);
    return [];
  }
  return (data ?? []) as DiaDisponible[];
}

export async function cargarHoras(fecha: string, n: number, ignorarCodigo?: string): Promise<HoraDisponible[]> {
  const p = z.object({ fecha: fechaISO, n: comensales }).safeParse({ fecha, n });
  if (!p.success) return [];
  const db = createAdminClient();
  const ignorar = ignorarCodigo ? await reservaIdPorCodigo(ignorarCodigo) : null;
  const { data, error } = await db.rpc("horas_disponibles", {
    p_fecha: p.data.fecha,
    p_comensales: p.data.n,
    p_ignorar_reserva: ignorar ?? undefined,
  });
  if (error) {
    console.error("horas_disponibles", error);
    return [];
  }
  return (data ?? []).map((h) => ({ ...h, inicio: new Date(h.inicio).toISOString() }));
}

export async function retener(input: {
  inicio: string;
  comensales: number;
  zona_id?: string | null;
  token_anterior?: string | null;
  codigo?: string;
}): Promise<ResultadoRetencion> {
  const p = z
    .object({
      inicio: instanteISO,
      comensales,
      zona_id: z.guid().nullish(),
      token_anterior: z.guid().nullish(),
      codigo: z.string().max(64).optional(),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, motivo: "datos_invalidos" };
  if (!(await permitir(`retener:${await ipCliente()}`, 30, 600))) return { ok: false, motivo: "limite" };

  const ignorar = p.data.codigo ? await reservaIdPorCodigo(p.data.codigo) : null;
  const { data, error } = await createAdminClient().rpc("retener_mesa", {
    p_inicio: p.data.inicio,
    p_comensales: p.data.comensales,
    p_zona: p.data.zona_id ?? undefined,
    p_token_anterior: p.data.token_anterior ?? undefined,
    p_ignorar_reserva: ignorar ?? undefined,
  });
  if (error) {
    console.error("retener_mesa", error);
    return { ok: false, motivo: "error" };
  }
  return data as ResultadoRetencion;
}

export async function liberar(token: string): Promise<void> {
  if (!z.guid().safeParse(token).success) return;
  await createAdminClient().rpc("liberar_retencion", { p_token: token });
}

export async function confirmar(input: unknown): Promise<ResultadoConfirmacion> {
  const p = confirmacion.safeParse(input);
  if (!p.success) return { ok: false, motivo: "validacion", errores: erroresPorCampo(p.error) };
  const ip = await ipCliente();
  if (!(await permitir(`confirmar:${ip}`, 10, 600))) return { ok: false, motivo: "limite" };
  if (!(await verificarTurnstile(p.data.turnstile, ip))) return { ok: false, motivo: "turnstile" };

  const { datos, ...resto } = p.data;
  const { data, error } = await createAdminClient().rpc("confirmar_reserva", {
    p_token: resto.token ?? crypto.randomUUID(),
    p_datos: {
      ...datos,
      alergias: datos.alergias || null,
      ocasion: datos.ocasion || null,
      inicio: resto.inicio,
      comensales: resto.comensales,
      zona_id: resto.zona_id ?? null,
      arroces: resto.arroces,
      segundos: resto.segundos ?? null,
    },
  });
  if (error) {
    console.error("confirmar_reserva", error);
    return { ok: false, motivo: "error" };
  }
  const r = data as ResultadoConfirmacion;
  if (r.ok) await notificarReserva(r.reserva_id, "confirmacion");
  return r;
}

export async function enviarSolicitudGrupo(input: unknown): Promise<ResultadoConfirmacion> {
  const p = solicitudGrupo.safeParse(input);
  if (!p.success) return { ok: false, motivo: "validacion", errores: erroresPorCampo(p.error) };
  const ip = await ipCliente();
  if (!(await permitir(`grupo:${ip}`, 5, 600))) return { ok: false, motivo: "limite" };
  if (!(await verificarTurnstile(p.data.turnstile, ip))) return { ok: false, motivo: "turnstile" };

  const db = createAdminClient();
  const { data: inicio } = await db.rpc("hora_local", { p_fecha: p.data.fecha, p_hora: p.data.hora });
  const { data, error } = await db.rpc("solicitar_grupo", {
    p_datos: { ...p.data.datos, inicio, comensales: p.data.comensales, alergias: p.data.datos.alergias || null },
  });
  if (error) {
    console.error("solicitar_grupo", error);
    return { ok: false, motivo: "error" };
  }
  const r = data as { ok: boolean; reserva_id?: string; codigo?: string; motivo?: string };
  if (!r.ok || !r.reserva_id) return { ok: false, motivo: r.motivo ?? "error" };
  await notificarReserva(r.reserva_id, "solicitud_grupo");
  return { ok: true, codigo: r.codigo!, inicio: String(inicio), fin: String(inicio), reserva_id: r.reserva_id };
}

export async function apuntarListaEspera(input: unknown): Promise<{ ok: boolean; errores?: Record<string, string> }> {
  const p = listaEspera.safeParse(input);
  if (!p.success) return { ok: false, errores: erroresPorCampo(p.error) };
  const ip = await ipCliente();
  if (!(await permitir(`espera:${ip}`, 5, 600))) return { ok: false };
  if (!(await verificarTurnstile(p.data.turnstile, ip))) return { ok: false };
  const { data, error } = await createAdminClient().rpc("apuntar_lista_espera", { p_datos: p.data });
  if (error) console.error("apuntar_lista_espera", error);
  return { ok: Boolean((data as { ok?: boolean } | null)?.ok) };
}

// ---------------------------------------------------------------------------
// Gestión por código
// ---------------------------------------------------------------------------

async function reservaIdPorCodigo(codigo: string): Promise<string | null> {
  const { data } = await createAdminClient().from("reserva").select("id").eq("codigo_gestion", codigo).maybeSingle();
  return data?.id ?? null;
}

export async function cancelarReserva(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!(await permitir(`gestion:${await ipCliente()}`, 20, 600))) return { ok: false, motivo: "limite" };
  const { data, error } = await createAdminClient().rpc("cancelar_por_codigo", { p_codigo: codigo });
  if (error) return { ok: false, motivo: "error" };
  const r = data as { ok: boolean; motivo?: string; reserva_id?: string };
  if (r.ok && r.reserva_id) {
    await notificarReserva(r.reserva_id, "cancelacion");
    await avisarListaEspera(r.reserva_id);
  }
  return r;
}

export async function reconfirmarReserva(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!(await permitir(`gestion:${await ipCliente()}`, 20, 600))) return { ok: false, motivo: "limite" };
  const { data, error } = await createAdminClient().rpc("reconfirmar_por_codigo", { p_codigo: codigo });
  if (error) return { ok: false, motivo: "error" };
  return data as { ok: boolean; motivo?: string };
}

export async function modificarReserva(input: {
  codigo: string;
  token: string | null;
  inicio: string;
  comensales: number;
  arroces?: { plato_id: string; raciones: number }[];
}): Promise<ResultadoConfirmacion> {
  const p = z
    .object({
      codigo: z.string().min(10).max(64),
      token: z.guid().nullable(),
      inicio: instanteISO,
      comensales,
      arroces: z.array(z.object({ plato_id: z.guid(), raciones: z.number().int().min(1) })).optional(),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, motivo: "validacion" };
  if (!(await permitir(`gestion:${await ipCliente()}`, 20, 600))) return { ok: false, motivo: "limite" };
  const { codigo, token, ...datos } = p.data;
  const { data, error } = await createAdminClient().rpc("modificar_por_codigo", {
    p_codigo: codigo,
    p_token: token as string, // admite null: la reserva solo cambia datos, no hora
    p_datos: datos,
  });
  if (error) {
    console.error("modificar_por_codigo", error);
    return { ok: false, motivo: "error" };
  }
  const r = data as { ok: boolean; motivo?: string; reserva_id?: string; alternativas?: Alternativa[] };
  if (!r.ok || !r.reserva_id) return { ok: false, motivo: r.motivo ?? "error", alternativas: r.alternativas };
  await notificarReserva(r.reserva_id, "modificacion");
  return { ok: true, codigo, inicio: datos.inicio, fin: datos.inicio, reserva_id: r.reserva_id };
}
