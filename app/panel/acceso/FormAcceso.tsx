"use client";

import { useActionState } from "react";
import { iniciarSesion } from "../acciones-sesion";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";

export function FormAcceso({ siguiente, aviso }: { siguiente: string; aviso?: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, {});
  const error = estado.error ?? aviso;
  return (
    <form action={accion} className="mt-6 space-y-4">
      <input type="hidden" name="siguiente" value={siguiente} />
      <Campo id="correo" name="correo" type="email" etiqueta="Correo" autoComplete="username" required />
      <Campo id="clave" name="clave" type="password" etiqueta="Contraseña" autoComplete="current-password" required />
      {error ? <p className="text-sm font-medium text-pimenton-oscuro" role="alert">{error}</p> : null}
      <Boton type="submit" cargando={pendiente} className="w-full">Entrar</Boton>
    </form>
  );
}
