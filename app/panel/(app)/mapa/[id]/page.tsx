import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirGestion } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { EditorDistribucion } from "@/components/panel/EditorDistribucion";
import { esquemaBorrador } from "@/lib/panel/borrador";

export const metadata: Metadata = { title: "Editar distribución" };

export default async function EditarDistribucionPage({ params }: PageProps<"/panel/mapa/[id]">) {
  await exigirGestion();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase.from("distribucion").select("id, nombre, estado, borrador_pendiente, zona(nombre, slug)").eq("id", id).maybeSingle();
  if (!d) notFound();
  const { data: borrador } = await supabase.rpc("borrador_de", { p_dist: id });
  const parsed = esquemaBorrador.safeParse(borrador);
  const zona = d.zona as unknown as { nombre: string; slug: string };
  return (
    <main>
      <EditorDistribucion
        key={id}
        distId={id}
        nombre={d.nombre}
        zona={zona.nombre}
        prefijo={zona.nombre.charAt(0).toUpperCase()}
        inicial={parsed.success ? parsed.data : { mesas: [], combinaciones: [], elementos: [] }}
        pendiente={d.borrador_pendiente}
        estado={d.estado}
      />
    </main>
  );
}
