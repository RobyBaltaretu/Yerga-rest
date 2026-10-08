import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaEditarDistribucion } from "./vista";

export const metadata: Metadata = { title: "Editar distribución" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaEditarDistribucion />
    </Suspense>
  );
}
