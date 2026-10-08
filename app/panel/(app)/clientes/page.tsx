import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaClientes } from "./vista";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaClientes />
    </Suspense>
  );
}
