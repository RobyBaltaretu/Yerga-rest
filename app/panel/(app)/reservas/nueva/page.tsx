import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaNuevaReserva } from "./vista";

export const metadata: Metadata = { title: "Nueva reserva" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaNuevaReserva />
    </Suspense>
  );
}
