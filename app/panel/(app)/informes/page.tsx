import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaInformes } from "./vista";

export const metadata: Metadata = { title: "Informes" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaInformes />
    </Suspense>
  );
}
