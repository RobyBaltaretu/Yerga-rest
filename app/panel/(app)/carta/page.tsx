import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaCarta } from "./vista";

export const metadata: Metadata = { title: "Carta y contenidos" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaCarta />
    </Suspense>
  );
}
