import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaConfiguracion } from "./vista";

export const metadata: Metadata = { title: "Configuración" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaConfiguracion />
    </Suspense>
  );
}
