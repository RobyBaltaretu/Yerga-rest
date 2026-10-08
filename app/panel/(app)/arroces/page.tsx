import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaArroces } from "./vista";

export const metadata: Metadata = { title: "Arroces del día" };

export default function ArrocesPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaArroces />
    </Suspense>
  );
}
