import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaMapa } from "./vista";

export const metadata: Metadata = { title: "Mapa de mesas" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaMapa />
    </Suspense>
  );
}
