import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaCliente } from "./vista";

export const metadata: Metadata = { title: "Cliente" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaCliente />
    </Suspense>
  );
}
