import type { Metadata } from "next";
import { exigirGestion } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/panel/Cabecera";
import { Configuracion } from "@/components/panel/config/Configuracion";
import { parseRango } from "@/lib/panel/datos";
import { fechaLocal } from "@/lib/format";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const sesion = await exigirGestion();
  const supabase = await createClient();
  const [{ data: config }, { data: turnos }, { data: bloqueos }, { data: plantillas }, { data: zonas }, { data: mesas }] = await Promise.all([
    supabase.from("configuracion").select("*").eq("id", 1).single(),
    supabase.from("turno").select("*").order("dia_semana").order("inicio"),
    supabase.from("bloqueo").select("*").order("creado_en", { ascending: false }).limit(200),
    supabase.from("plantilla_mensaje").select("*").order("tipo"),
    supabase.from("zona").select("id, nombre").order("orden"),
    supabase.from("mesa").select("id, nombre, distribucion!inner(estado, predeterminada)").eq("activa", true).eq("distribucion.predeterminada", true).order("nombre"),
  ]);
  const hoy = fechaLocal();
  const bloqueosFuturos = (bloqueos ?? [])
    .map((b) => {
      const [desde, hasta] = parseRango(String(b.rango));
      return { id: b.id, desde, hasta, turno_nombre: b.turno_nombre, zona_id: b.zona_id, mesa_id: b.mesa_id, motivo: b.motivo };
    })
    .filter((b) => fechaLocal(b.hasta) >= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde));

  return (
    <main className="pb-16">
      <Cabecera titulo="Configuración" descripcion="Reglas de disponibilidad, horarios, bloqueos y plantillas de mensajes. Todo se aplica al momento." />
      <Configuracion
        esAdmin={sesion.rol === "administrador"}
        config={config!}
        turnos={turnos ?? []}
        bloqueos={bloqueosFuturos}
        plantillas={plantillas ?? []}
        zonas={zonas ?? []}
        mesas={(mesas ?? []).map((m) => ({ id: m.id, nombre: m.nombre }))}
        hoy={hoy}
      />
    </main>
  );
}
