import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, ProveedorSesion } from "@/components/panel/DatosPanel";
import { VistaHoja } from "./vista";

export const metadata: Metadata = { title: "Hoja del turno" };

export default function HojaPage() {
  return (
    <ProveedorSesion>
      <Suspense fallback={<Cargando />}>
        <VistaHoja />
      </Suspense>
    </ProveedorSesion>
  );
}
