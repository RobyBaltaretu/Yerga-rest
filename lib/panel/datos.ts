import "server-only";
import { createClient } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n";
import type { BloqueoPanel, MesaPanel, ReservaPanel } from "./estados";

type Fila = Record<string, unknown> & {
  asignacion: { mesa_id: string; activa: boolean; mesa: { nombre: string } | null }[];
  encargo_arroz: { raciones: number; plato: { nombre: Record<string, string> } | null }[];
};

export function aReservaPanel(f: Fila, plantones: Map<string, number>): ReservaPanel {
  const r = f as unknown as ReservaPanel & Fila;
  return {
    ...(r as ReservaPanel),
    mesas: (f.asignacion ?? [])
      .filter((a) => a.activa)
      .map((a) => ({ id: a.mesa_id, nombre: a.mesa?.nombre ?? "?" }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })),
    arroces: (f.encargo_arroz ?? []).map((e) => ({ nombre: tr(e.plato?.nombre, "es"), raciones: e.raciones })),
    plantones: r.cliente_id ? (plantones.get(r.cliente_id) ?? 0) : 0,
  };
}

const SELECT_RESERVA =
  "*, asignacion(mesa_id, activa, mesa(nombre)), encargo_arroz(raciones, plato(nombre))";

/** Reservas de un día (por fecha local) con mesas, arroces y plantones previos. */
export async function reservasDelDia(fecha: string): Promise<ReservaPanel[]> {
  const supabase = await createClient();
  const [{ data: desde }, { data: hasta }] = await Promise.all([
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: "00:00" }),
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: "23:59:59" }),
  ]);
  const { data } = await supabase
    .from("reserva")
    .select(SELECT_RESERVA)
    .gte("inicio", desde!)
    .lte("inicio", hasta!)
    .order("inicio");
  const filas = (data ?? []) as unknown as Fila[];
  const clientes = [...new Set(filas.map((f) => f.cliente_id as string | null).filter(Boolean))] as string[];
  const plantones = new Map<string, number>();
  if (clientes.length) {
    const { data: ns } = await supabase.from("reserva").select("cliente_id").eq("estado", "no_presentada").in("cliente_id", clientes);
    for (const n of ns ?? []) plantones.set(n.cliente_id!, (plantones.get(n.cliente_id!) ?? 0) + 1);
  }
  return filas.map((f) => aReservaPanel(f, plantones));
}

export async function reservaPorId(id: string): Promise<ReservaPanel | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("reserva").select(SELECT_RESERVA).eq("id", id).maybeSingle();
  if (!data) return null;
  return aReservaPanel(data as unknown as Fila, new Map());
}

export type Zona = { id: string; nombre: string; slug: string };
export type ElementoFijo = { id: string; distribucion_id: string; tipo: string; x: number; y: number; giro: number; ancho: number; alto: number; etiqueta: string | null };
export type Combinacion = { id: string; nombre: string; mesas: string[]; capacidad_max: number };

/** Mesas y elementos de las distribuciones activas de un día y turno, por zona. */
export async function salaDelTurno(fecha: string, turno: string) {
  const supabase = await createClient();
  const { data: zonas } = await supabase.from("zona").select("id, nombre, slug").eq("activa", true).order("orden");
  const distribuciones = await Promise.all(
    (zonas ?? []).map(async (z) => {
      const { data } = await supabase.rpc("distribucion_activa", { p_zona: z.id, p_fecha: fecha, p_turno: turno });
      return { zona: z, distribucion: data as string | null };
    }),
  );
  const ids = distribuciones.map((d) => d.distribucion).filter(Boolean) as string[];
  const [{ data: mesas }, { data: elementos }, { data: combis }] = await Promise.all([
    supabase.from("mesa").select("*").in("distribucion_id", ids).eq("activa", true),
    supabase.from("elemento_fijo").select("*").in("distribucion_id", ids),
    supabase.from("combinacion").select("id, nombre, capacidad_max, distribucion_id, combinacion_mesa(mesa_id)").in("distribucion_id", ids),
  ]);
  const zonaDe = new Map(distribuciones.map((d) => [d.distribucion, d.zona.id]));
  return {
    zonas: (zonas ?? []) as Zona[],
    distribuciones: Object.fromEntries(distribuciones.map((d) => [d.zona.id, d.distribucion])),
    mesas: (mesas ?? [])
      .map((m) => ({ ...m, zona_id: zonaDe.get(m.distribucion_id)! }) as unknown as MesaPanel)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })),
    elementos: (elementos ?? []) as unknown as ElementoFijo[],
    combinaciones: (combis ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      capacidad_max: c.capacidad_max,
      mesas: (c.combinacion_mesa as { mesa_id: string }[]).map((x) => x.mesa_id),
    })) as Combinacion[],
  };
}

export async function bloqueosDelDia(fecha: string): Promise<BloqueoPanel[]> {
  const supabase = await createClient();
  const [{ data: desde }, { data: hasta }] = await Promise.all([
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: "00:00" }),
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: "23:59:59" }),
  ]);
  const { data } = await supabase.from("bloqueo").select("*").overlaps("rango", `[${desde},${hasta}]`);
  return (data ?? []).map((b) => {
    const [d, h] = parseRango(String(b.rango));
    return { id: b.id, desde: d, hasta: h, mesa_id: b.mesa_id, zona_id: b.zona_id, turno_nombre: b.turno_nombre, motivo: b.motivo };
  });
}

export async function reglasPanel() {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion").select("cortesia_min, aviso_conflicto_min, margen_min, max_comensales_online").eq("id", 1).single();
  return data!;
}

/** Turnos del día con sus horas, para elegir y para el deslizador. */
export async function turnosDelDia(fecha: string) {
  const supabase = await createClient();
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const { data } = await supabase.from("turno").select("nombre, inicio, fin, ultima_hora").eq("dia_semana", dow).eq("activo", true).order("inicio");
  return data ?? [];
}

/** Convierte un tstzrange de PostgREST ("[\"2026-10-08 22:00:00+00\",...)") en dos ISO. */
export function parseRango(rango: string): [string, string] {
  const partes = rango.replace(/[[\]()"]/g, "").split(",");
  const iso = (v: string) => {
    const s = v.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
    return new Date(s).toISOString();
  };
  return [iso(partes[0]), iso(partes[1])];
}
