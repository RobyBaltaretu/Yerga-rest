import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaReserva } from "./vista";

export const metadata: Metadata = { title: "Reserva" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaReserva />
    </Suspense>
  );
}
