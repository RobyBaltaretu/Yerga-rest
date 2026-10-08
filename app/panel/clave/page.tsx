import type { Metadata } from "next";
import { getSesion } from "@/lib/panel/sesion";
import { FormClave } from "./FormClave";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function ClavePage() {
  const s = await getSesion();
  return (
    <main className="grid min-h-dvh place-items-center bg-brasa px-4">
      <div className="w-full max-w-sm rounded-3xl bg-arroz p-8 shadow-2xl">
        <h1 className="font-display text-3xl">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-niebla">
          Hola, {s.nombre}. {s.debe_cambiar_clave ? "Es tu primer acceso: elige una contraseña propia." : "Elige una contraseña nueva."}
        </p>
        <FormClave />
      </div>
    </main>
  );
}
