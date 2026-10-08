"use client";

import { useActionState } from "react";
import { pedirRecuperacion } from "../../acciones-sesion";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";

export function FormRecuperar() {
  const [estado, accion, pendiente] = useActionState(pedirRecuperacion, {});
  if (estado.enviado) {
    return (
      <p className="mt-6 rounded-2xl bg-huerta-claro p-4 text-sm" role="status">
        Si el correo pertenece a un usuario del panel, en unos minutos recibirás el enlace. Revisa también el correo no deseado.
      </p>
    );
  }
  return (
    <form action={accion} className="mt-6 space-y-4">
      <Campo id="correo" name="correo" type="email" etiqueta="Correo" autoComplete="username" required />
      {estado.error ? <p className="text-sm font-medium text-pimenton-oscuro" role="alert">{estado.error}</p> : null}
      <Boton type="submit" cargando={pendiente} className="w-full">Enviar enlace</Boton>
    </form>
  );
}
