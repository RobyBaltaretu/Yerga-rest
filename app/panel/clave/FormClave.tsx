"use client";

import { useActionState } from "react";
import { cambiarClave } from "../acciones-sesion";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";

export function FormClave() {
  const [estado, accion, pendiente] = useActionState(cambiarClave, {});
  return (
    <form action={accion} className="mt-6 space-y-4">
      <Campo id="clave" name="clave" type="password" etiqueta="Contraseña nueva" autoComplete="new-password" minLength={10} required ayuda="Al menos 10 caracteres." />
      <Campo id="repetir" name="repetir" type="password" etiqueta="Repítela" autoComplete="new-password" required />
      {estado.error ? <p className="text-sm font-medium text-pimenton-oscuro" role="alert">{estado.error}</p> : null}
      <Boton type="submit" cargando={pendiente} className="w-full">Guardar</Boton>
    </form>
  );
}
