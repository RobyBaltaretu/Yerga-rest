"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, sinError, useDatos, useSesion } from "@/components/panel/DatosPanel";
import { GestionUsuarios } from "@/components/panel/config/GestionUsuarios";

export function VistaUsuarios() {
  return (
    <RequiereRol rol="admin">
      <Usuarios />
    </RequiereRol>
  );
}

function Usuarios() {
  const sesion = useSesion();
  const estado = useDatos(async (db) => sinError(await db.from("usuario").select("id, nombre, correo, rol, activo, debe_cambiar_clave").order("nombre")) ?? [], []);
  return (
    <main className="pb-16">
      <Cabecera titulo="Usuarios y roles" descripcion="Sala: opera el servicio. Encargado: todo salvo usuarios y datos legales. Administrador: todo." />
      <ConDatos estado={estado}>{(usuarios) => <GestionUsuarios usuarios={usuarios as never} yo={sesion.id} />}</ConDatos>
    </main>
  );
}
