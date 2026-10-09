import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { notificarReserva, rotarListaEspera } from "@/lib/notificaciones";
import { fechaLocal, sumarDias } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Tareas periódicas (Cron Trigger de Cloudflare cada 5 minutos):
 *  - caduca retenciones y marca «sin confirmar» (función tick de la base),
 *  - pasa al siguiente de la lista de espera las ofertas no aceptadas a tiempo,
 *  - envía el recordatorio 24 h antes con enlaces para confirmar o cancelar,
 *  - envía el agradecimiento al día siguiente con enlace para dejar reseña.
 */
export async function POST(request: NextRequest) {
  const secreto = serverEnv().cronSecret;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: tick } = await db.rpc("tick");
  // Lista de espera: ofertas sin respuesta en plazo pasan al siguiente.
  const esperaRotadas = await rotarListaEspera();
  const { data: c } = await db.from("configuracion").select("recordatorio_horas").eq("id", 1).single();
  const ahora = Date.now();
  const horas = c?.recordatorio_horas ?? 24;

  // Recordatorios: reservas que empiezan en las próximas N horas, hechas con
  // tiempo suficiente (una reserva de última hora no necesita recordatorio).
  const { data: pendientes } = await db
    .from("reserva")
    .select("id, inicio, creada_en")
    .in("estado", ["confirmada"])
    .is("recordatorio_enviado_en", null)
    .not("correo", "is", null)
    .gt("inicio", new Date(ahora).toISOString())
    .lte("inicio", new Date(ahora + horas * 3_600_000).toISOString());
  let recordatorios = 0;
  for (const r of pendientes ?? []) {
    if (Date.parse(r.inicio) - Date.parse(r.creada_en) < 12 * 3_600_000) continue;
    const enviado = await notificarReserva(r.id, "recordatorio");
    await db.from("reserva").update({ recordatorio_enviado_en: new Date().toISOString() }).eq("id", r.id);
    if (enviado) recordatorios++;
  }

  // Agradecimientos: a partir de las 11:00 del día siguiente a la visita.
  let agradecimientos = 0;
  const horaLocal = Number(new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date(ahora)));
  if (horaLocal >= 11) {
    const ayer = sumarDias(fechaLocal(), -1);
    const [{ data: desde }, { data: hasta }] = await Promise.all([
      db.rpc("hora_local", { p_fecha: ayer, p_hora: "00:00" }),
      db.rpc("hora_local", { p_fecha: fechaLocal(), p_hora: "00:00" }),
    ]);
    const { data: visitas } = await db
      .from("reserva")
      .select("id")
      .eq("estado", "finalizada")
      .is("agradecimiento_enviado_en", null)
      .not("correo", "is", null)
      .gte("inicio", desde!)
      .lt("inicio", hasta!);
    for (const r of visitas ?? []) {
      const enviado = await notificarReserva(r.id, "agradecimiento");
      await db.from("reserva").update({ agradecimiento_enviado_en: new Date().toISOString() }).eq("id", r.id);
      if (enviado) agradecimientos++;
    }
  }

  return NextResponse.json({ ok: true, tick, recordatorios, agradecimientos, esperaRotadas });
}
