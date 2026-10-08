import type { Metadata } from "next";
import { exigirGestion } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/panel/Cabecera";
import { ListaDistribuciones, type DistribucionFila } from "@/components/panel/ListaDistribuciones";

export const metadata: Metadata = { title: "Mapa de mesas" };

export default async function MapaPage() {
  await exigirGestion();
  const supabase = await createClient();
  const [{ data: zonas }, { data: dists }] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("activa", true).order("orden"),
    supabase
      .from("distribucion")
      .select("id, zona_id, nombre, estado, predeterminada, borrador_pendiente, publicada_en, programacion_distribucion(id, fecha, dia_semana, turno_nombre), mesa(count)")
      .order("nombre"),
  ]);
  return (
    <main className="pb-16">
      <Cabecera
        titulo="Mapa de mesas"
        descripcion="Modo «Editar distribución»: plantillas por zona, programadas por día de la semana, turno o fecha. Los cambios son borrador hasta publicar."
      />
      <ListaDistribuciones zonas={zonas ?? []} distribuciones={(dists ?? []) as unknown as DistribucionFila[]} />
    </main>
  );
}
