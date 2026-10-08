import type { Metadata } from "next";
import { Cabecera } from "@/components/panel/Cabecera";
import { NuevaReserva } from "@/components/panel/NuevaReserva";
import { createClient } from "@/lib/supabase/server";
import { fechaLocal } from "@/lib/format";

export const metadata: Metadata = { title: "Nueva reserva" };

export default async function NuevaPage({ searchParams }: PageProps<"/panel/reservas/nueva">) {
  const sp = await searchParams;
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : fechaLocal();
  const supabase = await createClient();
  const [{ data: zonas }, { data: horas }] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("activa", true).order("orden"),
    supabase.rpc("horas_disponibles", { p_fecha: fecha, p_comensales: 2, p_solo_online: false }),
  ]);
  return (
    <main className="pb-16">
      <Cabecera titulo="Nueva reserva" descripcion="Tres toques: personas, hora y nombre. El sistema propone la mesa." />
      <NuevaReserva fechaInicial={fecha} hoy={fechaLocal()} zonas={zonas ?? []} horasIniciales={(horas ?? []).map((h) => ({ ...h, inicio: new Date(h.inicio).toISOString() }))} />
    </main>
  );
}
