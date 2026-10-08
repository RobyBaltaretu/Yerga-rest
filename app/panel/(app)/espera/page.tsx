import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaEspera } from "./vista";

export const metadata: Metadata = { title: "Lista de espera" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaEspera />
    </Suspense>
  );
}
