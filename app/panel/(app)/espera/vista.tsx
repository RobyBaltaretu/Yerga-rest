"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, sinError, useDatos } from "@/components/panel/DatosPanel";
import { fechaLocal, formatFecha } from "@/lib/format";
import { AccionesEspera } from "./AccionesEspera";

const estados: Record<string, string> = { esperando: "Esperando", avisado: "Avisado", atendido: "Atendido", caducado: "Caducado", cancelado: "Cancelado" };

export function VistaEspera() {
  const estado = useDatos(
    async (db) =>
      sinError(await db.from("lista_espera").select("*").gte("fecha", fechaLocal()).order("fecha").order("turno_nombre").order("creado_en")) ?? [],
    [],
  );
  return (
    <main className="pb-16">
      <Cabecera titulo="Lista de espera" descripcion="Clientes que pidieron aviso si se libera una mesa. Al cancelarse una reserva se avisa por correo al primero que ahora cabe." />
      <ConDatos estado={estado}>
        {(filas) => {
          const grupos = new Map<string, typeof filas>();
          for (const e of filas) {
            const k = `${e.fecha}|${e.turno_nombre}`;
            grupos.set(k, [...(grupos.get(k) ?? []), e]);
          }
          return (
            <div className="space-y-6 px-4 py-6 sm:px-6">
              {grupos.size === 0 ? <p className="text-center text-niebla">Nadie en lista de espera.</p> : null}
              {[...grupos].map(([k, lista]) => {
                const [fecha, turno] = k.split("|");
                return (
                  <section key={k}>
                    <h2 className="font-display text-xl capitalize">{formatFecha(`${fecha}T12:00:00Z`, "es")} · {turno}</h2>
                    <ul className="mt-2 divide-y divide-tinta/10 rounded-2xl bg-white ring-1 ring-tinta/10">
                      {lista.map((e, i) => (
                        <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                          <div>
                            <p className="font-semibold">{i + 1}. {e.nombre} · {e.comensales} pax{e.hora_preferida ? ` · hacia las ${e.hora_preferida.slice(0, 5)}` : ""}</p>
                            <p className="text-sm text-niebla">
                              <a href={`tel:${e.telefono}`} className="underline">{e.telefono}</a> · {e.correo} · {estados[e.estado]}
                              {e.avisado_en ? ` ${new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", timeStyle: "short" }).format(new Date(e.avisado_en))}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/panel/reservas/nueva?fecha=${fecha}`} className="min-h-11 rounded-full bg-tinta px-4 py-2.5 text-sm font-semibold text-arroz">Reservar</Link>
                            <AccionesEspera id={e.id} estado={e.estado} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          );
        }}
      </ConDatos>
    </main>
  );
}
