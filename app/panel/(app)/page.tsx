import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaServicio } from "./vista";

export const metadata: Metadata = { title: "Servicio de hoy" };

export default function ServicioDeHoyPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaServicio />
    </Suspense>
  );
}
