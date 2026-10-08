import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaRegistro } from "./vista";

export const metadata: Metadata = { title: "Registro de cambios" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaRegistro />
    </Suspense>
  );
}
