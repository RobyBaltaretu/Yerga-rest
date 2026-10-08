import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/panel/Cabecera";
import { GestionUsuarios } from "@/components/panel/config/GestionUsuarios";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const sesion = await exigirAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("usuario").select("id, nombre, correo, rol, activo, debe_cambiar_clave").order("nombre");
  return (
    <main className="pb-16">
      <Cabecera titulo="Usuarios y roles" descripcion="Sala: opera el servicio. Encargado: todo salvo usuarios y datos legales. Administrador: todo." />
      <GestionUsuarios usuarios={(data ?? []) as never} yo={sesion.id} />
    </main>
  );
}
