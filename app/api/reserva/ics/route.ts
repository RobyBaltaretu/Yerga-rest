import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventoReserva } from "@/lib/ics";
import { publicEnv } from "@/lib/env";

// Archivo de calendario de una reserva, a partir de su código personal.
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo");
  if (!codigo || codigo.length > 64) return new NextResponse("Not found", { status: 404 });
  const db = createAdminClient();
  const [{ data: r }, { data: c }] = await Promise.all([
    db.from("reserva").select("id, inicio, fin, comensales, idioma, codigo_gestion").eq("codigo_gestion", codigo).maybeSingle(),
    db.from("configuracion").select("nombre_local, direccion, localidad").eq("id", 1).single(),
  ]);
  if (!r) return new NextResponse("Not found", { status: 404 });
  const enlace = `${publicEnv.siteUrl}/${r.idioma}/reservar/gestion/${encodeURIComponent(r.codigo_gestion)}`;
  const ics = eventoReserva({
    id: r.id,
    inicio: r.inicio,
    fin: r.fin,
    titulo: `${c?.nombre_local ?? "Arrocería Yerga"} · ${r.comensales}`,
    descripcion: enlace,
    lugar: [c?.direccion, c?.localidad].filter(Boolean).join(", "),
    url: enlace,
  });
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="reserva-yerga.ics"',
      "cache-control": "no-store",
    },
  });
}
