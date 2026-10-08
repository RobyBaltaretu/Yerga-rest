import type { Metadata } from "next";
import { FormAcceso } from "./FormAcceso";

export const metadata: Metadata = { title: "Acceso" };

export default async function AccesoPage({ searchParams }: PageProps<"/panel/acceso">) {
  const sp = await searchParams;
  const siguiente = typeof sp.siguiente === "string" ? sp.siguiente : "/panel";
  return (
    <main className="grid min-h-dvh place-items-center bg-brasa px-4">
      <div className="w-full max-w-sm rounded-3xl bg-arroz p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pimenton">Arrocería Yerga</p>
        <h1 className="mt-2 font-display text-3xl">Panel de sala</h1>
        <FormAcceso siguiente={siguiente} aviso={sp.error === "sin_permiso" ? "Tu usuario no tiene acceso al panel." : undefined} />
      </div>
    </main>
  );
}
