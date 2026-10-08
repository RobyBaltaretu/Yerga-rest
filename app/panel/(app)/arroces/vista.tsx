"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, esFecha, useDatos, useParam } from "@/components/panel/DatosPanel";
import { reservasDelDia } from "@/lib/panel/datos";
import { ACTIVAS, hora } from "@/lib/panel/estados";
import { fechaLocal, formatFecha, sumarDias } from "@/lib/format";

/** Resumen para cocina: arroces encargados por hora y mesa. */
export function VistaArroces() {
  const fecha = useParam("fecha", esFecha) ?? fechaLocal();
  const estado = useDatos(async (db) => (await reservasDelDia(db, fecha)).filter((r) => ACTIVAS.includes(r.estado) && r.arroces.length), [fecha]);

  return (
    <main className="pb-16">
      <Cabecera
        titulo="Arroces del día"
        descripcion={<span className="capitalize">{formatFecha(`${fecha}T12:00:00Z`, "es")}</span>}
        acciones={
          <>
            <Link href={`/panel/arroces?fecha=${sumarDias(fecha, -1)}`} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día anterior">‹</Link>
            <Link href={`/panel/arroces?fecha=${sumarDias(fecha, 1)}`} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día siguiente">›</Link>
            <Link href={`/panel/hoja?fecha=${fecha}`} target="_blank" className="min-h-11 rounded-full bg-tinta px-4 py-2.5 font-semibold text-arroz">Imprimir</Link>
          </>
        }
      />
      <ConDatos estado={estado}>
        {(reservas) => {
          const totales = new Map<string, number>();
          for (const r of reservas) for (const a of r.arroces) totales.set(a.nombre, (totales.get(a.nombre) ?? 0) + a.raciones);
          return (
            <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr]">
              <section>
                <h2 className="font-display text-xl">Totales</h2>
                <ul className="mt-2 space-y-2">
                  {[...totales].map(([n, t]) => (
                    <li key={n} className="flex justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-tinta/10"><span className="font-semibold">{n}</span><span className="tabular-nums">{t} raciones</span></li>
                  ))}
                  {!totales.size ? <li className="text-niebla">Ningún arroz encargado.</li> : null}
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl">Por hora</h2>
                <table className="mt-2 w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-niebla"><tr><th className="py-2">Hora</th><th>Mesa</th><th>Reserva</th><th>Arroz</th></tr></thead>
                  <tbody className="divide-y divide-tinta/10">
                    {reservas.flatMap((r) =>
                      r.arroces.map((a, i) => (
                        <tr key={`${r.id}-${i}`}>
                          <td className="py-2 font-semibold tabular-nums">{hora(r.inicio)}</td>
                          <td className="font-semibold">{r.mesas.map((m) => m.nombre).join("+") || "—"}</td>
                          <td>{r.nombre} ({r.comensales}){r.alergias ? <span className="ml-1 font-semibold text-pimenton-oscuro">⚕ {r.alergias}</span> : null}</td>
                          <td>{a.nombre} · {a.raciones}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          );
        }}
      </ConDatos>
    </main>
  );
}
