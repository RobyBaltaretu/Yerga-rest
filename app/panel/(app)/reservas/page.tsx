import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaReservas } from "./vista";

export const metadata: Metadata = { title: "Reservas" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaReservas />
    </Suspense>
  );
}
