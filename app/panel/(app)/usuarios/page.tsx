import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/components/panel/DatosPanel";
import { VistaUsuarios } from "./vista";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaUsuarios />
    </Suspense>
  );
}
