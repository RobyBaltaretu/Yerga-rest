"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, esFecha, useDatos, useParam } from "@/components/panel/DatosPanel";
import { reservasDelDia, turnosDelDia } from "@/lib/panel/datos";
import { resumenArroces, type Total } from "@/lib/panel/arroces";
import { hora } from "@/lib/panel/estados";
import { fechaLocal, formatFecha, sumarDias } from "@/lib/format";

const boton = "grid min-h-11 place-items-center rounded-full bg-white px-4 font-semibold ring-1 ring-tinta/15";

function Totales({ totales }: { totales: Total[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {totales.map((t) => (
        <li key={t.nombre} className="rounded-full bg-arroz-2 px-3 py-1 text-sm">
          <span className="font-semibold">{t.nombre}</span> <span className="tabular-nums">× {t.raciones}</span>
        </li>
      ))}
    </ul>
  );
}

/** Resumen para cocina: arroces encargados del turno, por franja de media hora y mesa. */
export function VistaArroces() {
  const fecha = useParam("fecha", esFecha) ?? fechaLocal();
  const turno = useParam("turno");
  const estado = useDatos(async (db) => {
    const [reservas, turnos] = await Promise.all([reservasDelDia(db, fecha), turnosDelDia(db, fecha)]);
    return { reservas, turnos: turnos.map((t) => t.nombre) };
  }, [fecha]);
  const enlace = (f: string, t: string | null) => `/panel/arroces?fecha=${f}${t ? `&turno=${encodeURIComponent(t)}` : ""}`;

  return (
    <main className="pb-16">
      <Cabecera
        titulo="Arroces del día"
        descripcion={
          <span className="capitalize">
            {formatFecha(`${fecha}T12:00:00Z`, "es")}
            {turno ? ` · ${turno}` : ""}
          </span>
        }
        acciones={
          <>
            <Link href={enlace(sumarDias(fecha, -1), turno)} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día anterior">‹</Link>
            <Link href={enlace(sumarDias(fecha, 1), turno)} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día siguiente">›</Link>
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-full bg-tinta px-4 py-2.5 font-semibold text-arroz">Imprimir</button>
          </>
        }
      />
      <ConDatos estado={estado}>
        {({ reservas, turnos }) => {
          const { totales, raciones, franjas } = resumenArroces(reservas, turno);
          return (
            <div className="space-y-6 px-4 py-6 sm:px-6">
              {turnos.length > 1 ? (
                <nav aria-label="Turno" className="flex flex-wrap gap-2 print:hidden">
                  {[null, ...turnos].map((t) => (
                    <Link key={t ?? "todo"} href={enlace(fecha, t)} aria-current={t === turno ? "page" : undefined} className={`${boton} capitalize aria-[current=page]:bg-tinta aria-[current=page]:text-arroz`}>
                      {t ?? "Todo el día"}
                    </Link>
                  ))}
                </nav>
              ) : null}

              <section aria-labelledby="totales">
                <h2 id="totales" className="font-display text-xl">
                  Totales <span className="text-base font-normal text-niebla">· {raciones} raciones</span>
                </h2>
                <div className="mt-2">{totales.length ? <Totales totales={totales} /> : <p className="text-niebla">Ningún arroz encargado.</p>}</div>
              </section>

              {franjas.map((f) => (
                <section key={f.desde} aria-labelledby={`franja-${f.desde}`} className="break-inside-avoid rounded-2xl bg-white p-4 ring-1 ring-tinta/10 print:ring-black/30">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id={`franja-${f.desde}`} className="font-display text-2xl tabular-nums">Desde las {f.desde}</h2>
                    <Totales totales={f.totales} />
                  </div>
                  <table className="mt-3 w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-niebla">
                      <tr><th className="py-1.5">Hora</th><th>Mesa</th><th>Reserva</th><th>Arroz</th></tr>
                    </thead>
                    <tbody className="divide-y divide-tinta/10">
                      {f.filas.map(({ reserva: r, nombre, raciones }, i) => (
                        <tr key={`${r.id}-${i}`}>
                          <td className="py-2 font-semibold tabular-nums">{hora(r.inicio)}</td>
                          <td className="font-semibold">{r.mesas.map((m) => m.nombre).join("+") || "—"}</td>
                          <td>
                            {r.nombre} ({r.comensales})
                            {r.alergias ? <span className="ml-1 font-semibold text-pimenton-oscuro">⚕ {r.alergias}</span> : null}
                          </td>
                          <td><span className="font-semibold">{nombre}</span> · {raciones}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          );
        }}
      </ConDatos>
    </main>
  );
}
