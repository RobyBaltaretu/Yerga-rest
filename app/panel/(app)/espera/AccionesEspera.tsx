"use client";

import { useTransition } from "react";
import { cambiarEstadoEspera } from "@/app/panel/acciones";

export function AccionesEspera({ id, estado }: { id: string; estado: string }) {
  const [pendiente, startTransition] = useTransition();
  if (estado === "atendido" || estado === "cancelado") return null;
  return (
    <>
      {estado === "esperando" ? (
        <button type="button" disabled={pendiente} onClick={() => startTransition(async () => void (await cambiarEstadoEspera(id, "avisado")))} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-tinta/15">Avisado</button>
      ) : null}
      <button type="button" disabled={pendiente} onClick={() => startTransition(async () => void (await cambiarEstadoEspera(id, "atendido")))} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-tinta/15">Atendido</button>
      <button type="button" disabled={pendiente} onClick={() => startTransition(async () => void (await cambiarEstadoEspera(id, "cancelado")))} className="min-h-11 rounded-full px-3 text-sm font-semibold underline">Quitar</button>
    </>
  );
}
